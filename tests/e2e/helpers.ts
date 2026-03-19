import { Page } from '@playwright/test'

export const SUPABASE_URL = 'https://mneowgfoglguuwjxcwi.supabase.co'

export const TEST_USER = {
  id: 'test-user-id',
  email: 'test@jamieatwork.app',
  name: 'Test Founder',
  password: 'TestPassword123!',
}

export const MOCK_SCRAPED = {
  extracted: {
    product_name: 'Acme Analytics',
    product_description: 'Real-time analytics for SaaS companies',
    problem_solved: 'Founders waste hours in spreadsheets instead of growing',
    key_differentiators: 'AI-powered insights, 5-minute setup, built for startups',
    suggested_industries: 'SaaS, Fintech',
    suggested_roles: 'CEO, Head of Growth, VP Sales',
  },
}

export const CHAT_RESPONSES = [
  'Great to meet you! Let me ask you a few things to fine-tune my approach. What are the **top 2-3 objections** you hear from prospects, and how do you typically handle them?',
  'Got it — pricing and competition concerns. Makes sense. Now, how do you **qualify leads**? What questions help you decide if someone is worth a meeting, and what are the deal-breakers?',
  '🎉 Perfect — I\'ve got everything I need! Building your Sales Playbook now...',
]

export const MOCK_PLAYBOOK = {
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
      { objection: "It's too expensive", response: 'We show ROI within the first week — most customers save 10+ hours/month.' },
      { objection: 'We already use Google Analytics', response: 'GA is great for web traffic. We focus on SaaS metrics — MRR, churn, LTV — out of the box.' },
    ],
    voice_style: 'Chill — friendly, casual, like a smart colleague',
    call_to_action: 'Book a demo',
    calendar_link: 'calendly.com/acme/demo',
  },
}

/** Mock Supabase auth to return an authenticated user */
export async function mockAuthenticatedUser(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/user`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_USER.id,
        email: TEST_USER.email,
        role: 'authenticated',
        user_metadata: { full_name: TEST_USER.name },
      }),
    })
  )

  await page.route(`${SUPABASE_URL}/auth/v1/token*`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: { id: TEST_USER.id, email: TEST_USER.email, role: 'authenticated' },
      }),
    })
  )
}

/** Mock Supabase auth to return no user (unauthenticated) */
export async function mockUnauthenticatedUser(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/user`, route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'not authenticated' }),
    })
  )
}

/** Mock Supabase auth signup endpoint */
export async function mockSignUp(page: Page, options?: { shouldFail?: boolean; errorMessage?: string }) {
  await page.route(`${SUPABASE_URL}/auth/v1/signup`, route => {
    if (options?.shouldFail) {
      return route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: options.errorMessage || 'Signup failed', message: options.errorMessage || 'Signup failed' }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_USER.id,
        email: TEST_USER.email,
        role: 'authenticated',
        confirmation_sent_at: new Date().toISOString(),
      }),
    })
  })
}

/** Mock the training API with standard responses */
export async function mockTrainingAPI(page: Page) {
  let chatCallCount = 0

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
}

/** Mock Supabase REST inserts and return captured requests */
export async function mockSupabaseInserts(page: Page) {
  const captured: { table: string; body: unknown }[] = []

  await page.route(`${SUPABASE_URL}/rest/v1/companies*`, route => {
    if (route.request().method() === 'POST') {
      captured.push({ table: 'companies', body: JSON.parse(route.request().postData() || '{}') })
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
      captured.push({ table: 'onboarding_profiles', body: JSON.parse(route.request().postData() || '{}') })
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
      captured.push({ table: 'digital_employees', body: JSON.parse(route.request().postData() || '{}') })
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'emp-uuid-789', name: 'Jamie', status: 'active' }),
      })
    }
    return route.continue()
  })

  return captured
}
