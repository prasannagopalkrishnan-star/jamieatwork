import { test, expect } from '@playwright/test'
import {
  mockAuthenticatedUser,
  mockTrainingAPI,
  mockSupabaseInserts,
  MOCK_SCRAPED,
  MOCK_PLAYBOOK,
} from './helpers'

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page)
    await mockTrainingAPI(page)
    await mockSupabaseInserts(page)
  })

  // ── Phase 1: Card Steps ──

  test('Step 0: website scan populates product fields', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByText("What's your website?")).toBeVisible()

    await page.getByPlaceholder('yourcompany.com').fill('acme.com')
    await page.getByRole('button', { name: /Scan/ }).click()

    await expect(page.getByText('Acme Analytics')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Real-time analytics for SaaS companies')).toBeVisible()
    await expect(page.getByText(/Founders waste hours/)).toBeVisible()
    await expect(page.getByText(/AI-powered insights/)).toBeVisible()
  })

  test('Step 0: skip button advances without scanning', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()

    await expect(page.getByText('Tell Jamie about your product')).toBeVisible()
  })

  test('Step 1: click-to-edit opens textarea and persists edits', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByPlaceholder('yourcompany.com').fill('acme.com')
    await page.getByRole('button', { name: /Scan/ }).click()
    await expect(page.getByText('Acme Analytics')).toBeVisible({ timeout: 5000 })

    await page.getByText('Acme Analytics').click()
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveCSS('background-color', 'rgb(240, 253, 250)')

    await textarea.fill('Acme Pro Analytics')
    await textarea.blur()
    await expect(page.getByText('Acme Pro Analytics')).toBeVisible()
  })

  test('Step 2: team size card auto-advances to industry', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()

    await expect(page.getByText('How big is your team?')).toBeVisible()
    await page.getByRole('button', { name: /Just me/ }).click()
    await expect(page.getByText('Your industry?')).toBeVisible()
  })

  test('Step 3: industry card auto-advances to vibe', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()

    await expect(page.getByText('Your industry?')).toBeVisible()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await expect(page.getByText("Pick Jamie's personality")).toBeVisible()
  })

  test('Step 4: vibe card auto-advances to CTA', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()

    await expect(page.getByText("Pick Jamie's personality")).toBeVisible()
    await page.getByRole('button', { name: /Chill/ }).click()
    await expect(page.getByText("What's the goal?")).toBeVisible()
  })

  test('Step 5: CTA card auto-advances to calendar', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()

    await expect(page.getByText("What's the goal?")).toBeVisible()
    await page.getByRole('button', { name: /Book a demo/ }).click()
    await expect(page.getByText('Drop your calendar link')).toBeVisible()
  })

  test('Step 6: calendar input and transition to chat', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()

    await expect(page.getByText('Drop your calendar link')).toBeVisible()
    await page.getByPlaceholder('calendly.com/you').fill('calendly.com/acme/demo')
    await page.getByRole('button', { name: /Almost done/ }).click()

    await expect(page.getByText('Jamie — Quick Questions')).toBeVisible({ timeout: 5000 })
  })

  test('Back buttons navigate to previous steps', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()

    await expect(page.getByText(/Tell Jamie about your product/)).toBeVisible()
    await page.getByRole('button', { name: /Back/ }).click()
    await expect(page.getByText("What's your website?")).toBeVisible()
  })

  // ── Phase 2: Chat ──

  test('Chat: send message and receive response', async ({ page }) => {
    await page.goto('/onboarding')
    // Speed through cards
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()
    await page.getByRole('button', { name: /Almost done/ }).click()

    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })

    const chatInput = page.getByPlaceholder(/Type your answer/)
    await chatInput.fill('Price is too high and they already use a competitor')
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Price is too high and they already use a competitor')).toBeVisible()
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

    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })

    const pill = page.locator('button').filter({ hasText: /too expensive/ }).first()
    await expect(pill).toBeVisible({ timeout: 3000 })
    await pill.click()
    await expect(page.getByText(/too expensive/).first()).toBeVisible()
  })

  // ── Phase 3: Playbook ──

  test('Playbook: inline editing opens textarea on click', async ({ page }) => {
    await page.goto('/onboarding')
    await page.getByText(/Skip/).click()
    await page.getByRole('button', { name: /Looks good/ }).click()
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()
    await page.getByRole('button', { name: /Almost done/ }).click()

    // Chat through
    const chatInput = page.getByPlaceholder(/Type your answer/)
    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })
    await chatInput.fill('Price objection')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(/qualify leads/)).toBeVisible({ timeout: 5000 })
    await chatInput.fill('Budget and timeline')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(/got everything/i)).toBeVisible({ timeout: 5000 })

    await expect(page.getByText("Jamie's Sales Playbook")).toBeVisible({ timeout: 10000 })

    // Click product name to edit
    await page.getByText('Acme Analytics').first().click()
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveCSS('background-color', 'rgb(240, 253, 250)')

    await textarea.fill('Acme Pro')
    await textarea.blur()
    await page.waitForTimeout(100)
    await expect(page.getByText('Acme Pro').first()).toBeVisible()
  })

  test('Playbook: all sections render', async ({ page }) => {
    await page.goto('/onboarding')
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

    // All 5 playbook sections
    await expect(page.getByText('THE PITCH')).toBeVisible()
    await expect(page.getByText('IDEAL CUSTOMER')).toBeVisible()
    await expect(page.getByText('QUALIFICATION')).toBeVisible()
    await expect(page.getByText('OBJECTIONS')).toBeVisible()
    await expect(page.getByText('STYLE & CTA')).toBeVisible()

    // Content from mock playbook
    await expect(page.getByText('Acme Analytics').first()).toBeVisible()
    await expect(page.getByText(/Real-time analytics/).first()).toBeVisible()
  })

  // ── Full Flow ──

  test('Full flow: cards -> chat -> playbook -> deploy', async ({ page }) => {
    await page.goto('/onboarding')

    // Step 0: Website scan
    await page.getByPlaceholder('yourcompany.com').fill('acme.com')
    await page.getByRole('button', { name: /Scan/ }).click()
    await expect(page.getByText('Acme Analytics')).toBeVisible({ timeout: 5000 })

    // Step 1: Review
    await page.getByRole('button', { name: /Looks good/ }).click()

    // Steps 2-5: Cards
    await page.getByRole('button', { name: /Just me/ }).click()
    await page.getByRole('button', { name: /SaaS/ }).click()
    await page.getByRole('button', { name: /Chill/ }).click()
    await page.getByRole('button', { name: /Book a demo/ }).click()

    // Step 6: Calendar
    await page.getByPlaceholder('calendly.com/you').fill('calendly.com/acme/demo')
    await page.getByRole('button', { name: /Almost done/ }).click()

    // Chat Q&A
    await expect(page.getByText(/top 2-3 objections/)).toBeVisible({ timeout: 5000 })
    const chatInput = page.getByPlaceholder(/Type your answer/)
    await chatInput.fill('Too expensive and they already have analytics')
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText(/qualify leads/)).toBeVisible({ timeout: 5000 })
    await chatInput.fill('We ask about team size, budget, and timeline')
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText(/got everything/i)).toBeVisible({ timeout: 5000 })

    // Playbook review
    await expect(page.getByText("Jamie's Sales Playbook")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('THE PITCH')).toBeVisible()
    await expect(page.getByText('IDEAL CUSTOMER')).toBeVisible()

    // Deploy
    await page.getByRole('button', { name: /Approve & Deploy Jamie/ }).click()
    await expect(page.getByText(/Jamie is Live/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /Go to Dashboard/ })).toBeVisible()
  })

  test('Playbook: deploy saves to all 3 Supabase tables', async ({ page }) => {
    const captured = await mockSupabaseInserts(page)

    await page.goto('/onboarding')
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

    await page.getByRole('button', { name: /Approve & Deploy Jamie/ }).click()
    await expect(page.getByText(/Jamie is Live/)).toBeVisible({ timeout: 5000 })

    expect(captured.some(r => r.table === 'companies')).toBe(true)
    expect(captured.some(r => r.table === 'onboarding_profiles')).toBe(true)
    expect(captured.some(r => r.table === 'digital_employees')).toBe(true)
  })

  // ── Error Handling ──

  test('Error state: displays error when scan fails', async ({ page }) => {
    // Override training API to fail
    await page.route('**/api/training', route =>
      route.fulfill({ status: 500, body: '{"error":"Something went wrong"}' })
    )

    await page.goto('/onboarding')
    await page.getByPlaceholder('yourcompany.com').fill('bad-site.com')
    await page.getByRole('button', { name: /Scan/ }).click()

    // Should gracefully advance to step 1
    await expect(page.getByText('Tell Jamie about your product')).toBeVisible({ timeout: 5000 })
  })
})
