import { test, expect, Page } from '@playwright/test'

// ── Mock data ──

const MOCK_SCRAPED = {
  extracted: {
    product_name: 'Acme Analytics',
    product_description: 'Real-time analytics for SaaS companies',
    problem_solved: 'Founders waste hours in spreadsheets instead of growing',
    key_differentiators: 'AI-powered insights, 5-minute setup, built for startups',
    suggested_industries: 'SaaS, Fintech',
    suggested_roles: 'CEO, Head of Growth, VP Sales',
  },
}

const CHAT_RESPONSES = [
  'Great to meet you! Let me ask you a few things to fine-tune my approach. What are the **top 2-3 objections** you hear from prospects, and how do you typically handle them?',
  'Got it — pricing and competition concerns. Makes sense. Now, how do you **qualify leads**? What questions help you decide if someone is worth a meeting, and what are the deal-breakers?',
  '🎉 Perfect — I\'ve got everything I need! Building your Sales Playbook now...',
]

const MOCK_PLAYBOOK = {
  playbook: {
    product_name: 'Acme Analytics',
    product_description: 'Real-time analytics for SaaS companies',
    problem_solved: 'Founders waste hours in spreadsheets instead of growing',
    key_differentiators: 'AI-powered insights, 5-minute setup, built for startups',
    target_company_size: '1-50 employees',
    target_industries: 'SaaS, Fintech',
    target_roles: 'CEO, Head of Growth',
    icp_signals: 'Recently raised funding, hiring for growth roles',
    qualification_questions: [
      'What analytics tool are you currently using?',
      'How many hours per week do you spend on reporting?',
      'What is your timeline for implementing a solution?',
    ],
    disqualification_criteria: 'No budget, no decision-making authority, enterprise-only needs',
    objection_playbook: [
      { objection: 'It\'s too expensive', response: 'We show ROI within the first week — most customers save 10+ hours/month.' },
      { objection: 'We already use Google Analytics', response: 'GA is great for web traffic. We focus on SaaS metrics — MRR, churn, LTV — out of the box.' },
    ],
    voice_style: 'Chill — friendly, casual, like a smart colleague',
    call_to_action: 'Book a demo',
    calendar_link: 'calendly.com/acme/demo',
  },
}

const SUPABASE_URL = 'https://mneowgfoglguuwjxcwi.supabase.co'

// ── Helpers ──

/** Set up all route mocks needed for the onboarding flow */
async function setupMocks(page: Page) {
  // Mock Supabase auth — return a fake authenticated user so middleware allows access
  await page.route(`${SUPABASE_URL}/auth/v1/user`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com', role: 'authenticated' }),
    })
  )

  // Track chat call count to cycle through responses
  let chatCallCount = 0

  // Mock /api/training
  await page.route('**/api/training', async (route, request) => {
    const body = JSON.parse(request.postData() || '{}')

    if (body.action === 'scrape_website') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SCRAPED),
      })
    }

    if (body.action === 'chat') {
      const response = CHAT_RESPONSES[Math.min(chatCallCount, CHAT_RESPONSES.length - 1)]
      chatCallCount++
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: response }),
      })
    }

    if (body.action === 'generate_playbook') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAYBOOK),
      })
    }

    return route.fulfill({ status: 400, body: '{"error":"unknown action"}' })
  })

  // Mock Supabase REST API inserts (companies, onboarding_profiles, digital_employees)
  await page.route(`${SUPABASE_URL}/rest/v1/companies*`, route => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'company-uuid-123', name: 'Acme Analytics', domain: 'acme.com' }),
      })
    }
    return route.continue()
  })

  await page.route(`${SUPABASE_URL}/rest/v1/onboarding_profiles*`, route => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'profile-uuid-456', company_id: 'company-uuid-123', status: 'completed' }),
      })
    }
    return route.continue()
  })

  await page.route(`${SUPABASE_URL}/rest/v1/digital_employees*`, route => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'emp-uuid-789', name: 'Jamie', status: 'active' }),
      })
    }
    return route.continue()
  })
}

// ── Tests ──

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
  })

  test('Step 0: website scan populates product fields', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByText("What's your website?")).toBeVisible()

    // Enter URL and scan
    await page.getByPlaceholder('yourcompany.com').fill('acme.com')
    await page.getByRole('button', { name: /Scan/ }).click()

    // Should advance to step 1 with scraped data
    await expect(page.getByText('Acme Analytics')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Real-time analytics for SaaS companies')).toBeVisible()
    await expect(page.getByText(/Founders waste hours/)).toBeVisible()
    await expect(page.getByText(/AI-powered insights/)).toBeVisible()
  })

  test('Step 0: skip button advances without scanning', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()

    // Should go to step 1 without scraped data
    await expect(page.getByText('Tell Jamie about your product')).toBeVisible()
  })

  test('Step 1: click-to-edit opens textarea and persists edits', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByPlaceholder('yourcompany.com').fill('acme.com')
    await page.getByRole('button', { name: /Scan/ }).click()
    await expect(page.getByText('Acme Analytics')).toBeVisible({ timeout: 5000 })

    // Click on the product name text to edit
    await page.getByText('Acme Analytics').click()
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveCSS('background-color', 'rgb(240, 253, 250)') // accentLight #F0FDFA

    // Clear and type a new value
    await textarea.fill('Acme Pro Analytics')
    await textarea.blur()

    // The edited value should persist
    await expect(page.getByText('Acme Pro Analytics')).toBeVisible()
  })

  test('Step 2: team size card auto-advances to industry', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()

    // Step 2: team size
    await expect(page.getByText('How big is your team?')).toBeVisible()
    await page.getByRole('button', { name: /Just me/ }).click()

    // Should auto-advance to step 3: industry
    await expect(page.getByText('Your industry?')).toBeVisible()
  })

  test('Step 3: industry card auto-advances to vibe', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()

    // Step 3: industry
    await expect(page.getByText('Your industry?')).toBeVisible()
    await page.getByRole('button', { name: /SaaS/ }).click()

    // Should auto-advance to step 4: vibe
    await expect(page.getByText("Pick Jamie's personality")).toBeVisible()
  })

  test('Step 4: vibe card auto-advances to CTA', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()

    // Step 4: vibe
    await expect(page.getByText("Pick Jamie's personality")).toBeVisible()
    await page.getByRole('button', { name: /Chill/ }).click()

    // Should auto-advance to step 5: CTA
    await expect(page.getByText("What's the goal?")).toBeVisible()
  })

  test('Step 5: CTA card auto-advances to calendar', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()

    // Step 5: CTA
    await expect(page.getByText("What's the goal?")).toBeVisible()
    await page.getByRole('button', { name: /Book a demo/ }).click()

    // Should auto-advance to step 6: calendar
    await expect(page.getByText('Drop your calendar link')).toBeVisible()
  })

  test('Step 6: calendar input and transition to chat', async ({ page }) => {
    await page.goto('/onboarding')
    // Speed through card steps
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()

    // Step 6: calendar
    await expect(page.getByText('Drop your calendar link')).toBeVisible()
    await page.getByPlaceholder('calendly.com/you').fill('calendly.com/acme/demo')
    await page.getByRole('button', { name: /Almost done/ }).click()

    // Should transition to chat phase
    await expect(page.getByText('Jamie — Quick Questions')).toBeVisible({ timeout: 5000 })
  })

  test('Back buttons navigate to previous steps', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()

    // Step 1 → back to step 0
    await expect(page.getByText(/Tell Jamie about your product/)).toBeVisible()
    await page.getByRole('button', { name: /Back/ }).click()
    await expect(page.getByText("What's your website?")).toBeVisible()
  })

  test('Chat: send message and receive response', async ({ page }) => {
    await page.goto('/onboarding')
    // Speed through all card steps
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()
    await page.getByRole('button', { name: /Almost done/ }).click()

    // Wait for Jamie's first message (chat response 0 — the initial greeting is also a chat call)
    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })

    // Type and send a message
    const chatInput = page.getByPlaceholder(/Type your answer/)
    await chatInput.fill('Price is too high and they already use a competitor')
    await page.getByRole('button', { name: 'Send' }).click()

    // User message should appear
    await expect(page.getByText('Price is too high and they already use a competitor')).toBeVisible()

    // Jamie's second response should appear
    await expect(page.getByText(/qualify leads/)).toBeVisible({ timeout: 5000 })
  })

  test('Chat: suggestion pills send messages', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()
    await page.getByRole('button', { name: /Almost done/ }).click()

    // Wait for Jamie's first message
    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })

    // Suggestion pills should appear — click one
    const pill = page.locator('button').filter({ hasText: /too expensive/ }).first()
    await expect(pill).toBeVisible({ timeout: 3000 })
    await pill.click()

    // The pill text should appear as a user message
    await expect(page.getByText(/too expensive/).first()).toBeVisible()
  })

  test('Full flow: cards → chat → playbook → deploy', async ({ page }) => {
    await page.goto('/onboarding')

    // ── Step 0: Website scan ──
    await page.getByPlaceholder('yourcompany.com').fill('acme.com')
    await page.getByRole('button', { name: /Scan/ }).click()
    await expect(page.getByText('Acme Analytics')).toBeVisible({ timeout: 5000 })

    // ── Step 1: Review fields ──
    await page.getByRole('button', { name: /Looks good/ }).click()

    // ── Steps 2-5: Card selections (auto-advance) ──
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()

    // ── Step 6: Calendar ──
    await page.getByPlaceholder('calendly.com/you').fill('calendly.com/acme/demo')
    await page.getByRole('button', { name: /Almost done/ }).click()

    // ── Chat Phase ──
    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })

    // Answer Q1
    const chatInput = page.getByPlaceholder(/Type your answer/)
    await chatInput.fill('Too expensive and they already have analytics')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for Q2
    await expect(page.getByText(/qualify leads/)).toBeVisible({ timeout: 5000 })

    // Answer Q2
    await chatInput.fill('We ask about team size, budget, and timeline')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for the "got everything" completion message
    await expect(page.getByText(/got everything/i)).toBeVisible({ timeout: 5000 })

    // ── Playbook Review Phase ──
    await expect(page.getByText("Jamie's Sales Playbook")).toBeVisible({ timeout: 10000 })

    // Verify playbook sections rendered
    await expect(page.getByText('THE PITCH')).toBeVisible()
    await expect(page.getByText('IDEAL CUSTOMER')).toBeVisible()
    await expect(page.getByText('QUALIFICATION')).toBeVisible()
    await expect(page.getByText('OBJECTIONS')).toBeVisible()
    await expect(page.getByText('STYLE & CTA')).toBeVisible()

    // Verify playbook content
    await expect(page.getByText('Acme Analytics').first()).toBeVisible()
    await expect(page.getByText(/Real-time analytics/).first()).toBeVisible()

    // ── Deploy ──
    await page.getByRole('button', { name: /Approve & Deploy Jamie/ }).click()
    await expect(page.getByText(/Jamie is Live/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Jamie is deployed/)).toBeVisible()
    await expect(page.getByRole('link', { name: /Go to Dashboard/ })).toBeVisible()
  })

  test('Playbook: inline editing opens textarea on click', async ({ page }) => {
    // Navigate straight to playbook review by going through the full flow quickly
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()
    await page.getByRole('button', { name: /Almost done/ }).click()

    // Chat through
    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })
    const chatInput = page.getByPlaceholder(/Type your answer/)
    await chatInput.fill('Price objection')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(/qualify leads/)).toBeVisible({ timeout: 5000 })
    await chatInput.fill('Budget and timeline')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(/got everything/i)).toBeVisible({ timeout: 5000 })

    // Wait for playbook
    await expect(page.getByText("Jamie's Sales Playbook")).toBeVisible({ timeout: 10000 })

    // Click on the product name to edit it
    const productField = page.getByText('Acme Analytics').first()
    await productField.click()

    // A textarea should appear with teal background
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveCSS('background-color', 'rgb(240, 253, 250)')

    // Edit the value
    await textarea.fill('Acme Pro')
    await textarea.blur()
    // Wait for rAF blur handler
    await page.waitForTimeout(100)

    // Edited value should persist
    await expect(page.getByText('Acme Pro').first()).toBeVisible()
  })

  test('Playbook: deploy saves to Supabase', async ({ page }) => {
    // Capture the Supabase insert requests
    const supabaseRequests: { table: string; body: unknown }[] = []

    await page.route(`${SUPABASE_URL}/rest/v1/companies*`, async route => {
      if (route.request().method() === 'POST') {
        supabaseRequests.push({ table: 'companies', body: JSON.parse(route.request().postData() || '{}') })
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'company-uuid-123', name: 'Acme Analytics', domain: 'acme.com' }),
        })
      }
      return route.continue()
    })

    await page.route(`${SUPABASE_URL}/rest/v1/onboarding_profiles*`, async route => {
      if (route.request().method() === 'POST') {
        supabaseRequests.push({ table: 'onboarding_profiles', body: JSON.parse(route.request().postData() || '{}') })
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'profile-uuid-456', company_id: 'company-uuid-123', status: 'completed' }),
        })
      }
      return route.continue()
    })

    await page.route(`${SUPABASE_URL}/rest/v1/digital_employees*`, async route => {
      if (route.request().method() === 'POST') {
        supabaseRequests.push({ table: 'digital_employees', body: JSON.parse(route.request().postData() || '{}') })
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'emp-uuid-789', name: 'Jamie', status: 'active' }),
        })
      }
      return route.continue()
    })

    await page.goto('/onboarding')

    // Speed through the flow
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()
    await page.getByRole('button', { name: /Almost done/ }).click()

    const chatInput = page.getByPlaceholder(/Type your answer/)
    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })
    await chatInput.fill('Price')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(/qualify leads/)).toBeVisible({ timeout: 5000 })
    await chatInput.fill('Budget')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(/got everything/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Jamie's Sales Playbook")).toBeVisible({ timeout: 10000 })

    // Deploy
    await page.getByRole('button', { name: /Approve & Deploy Jamie/ }).click()
    await expect(page.getByText(/Jamie is Live/)).toBeVisible({ timeout: 5000 })

    // Verify all 3 Supabase tables were written to
    expect(supabaseRequests.some(r => r.table === 'companies')).toBe(true)
    expect(supabaseRequests.some(r => r.table === 'onboarding_profiles')).toBe(true)
    expect(supabaseRequests.some(r => r.table === 'digital_employees')).toBe(true)
  })

  test('Error state: displays error when scan fails', async ({ page }) => {
    // Override the training API to return an error for scrape
    await page.route('**/api/training', route =>
      route.fulfill({ status: 500, body: '{"error":"Something went wrong"}' })
    )

    await page.goto('/onboarding')
    await page.getByPlaceholder('yourcompany.com').fill('bad-site.com')
    await page.getByRole('button', { name: /Scan/ }).click()

    // Should still advance to step 1 (scan failure is graceful)
    await expect(page.getByText('Tell Jamie about your product')).toBeVisible({ timeout: 5000 })
  })
})
