import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('renders hero section', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Your AI Sales Development Rep')).toBeVisible()
    await expect(page.getByText('Your SDR.')).toBeVisible()
    await expect(page.getByText('Trained in 10 minutes.')).toBeVisible()
  })

  test('renders capabilities section', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('What Jamie Does')).toBeVisible()
    await expect(page.getByText('Inbound Chat')).toBeVisible()
    await expect(page.getByText('Outbound Email')).toBeVisible()
    await expect(page.getByText('Lead Qualification')).toBeVisible()
    await expect(page.getByText('Meeting Booking')).toBeVisible()
    await expect(page.getByText('Follow-ups')).toBeVisible()
    await expect(page.getByText('Pipeline Dashboard')).toBeVisible()
  })

  test('renders How It Works section', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Ready in')).toBeVisible()
    await expect(page.getByText('Drop your website')).toBeVisible()
    await expect(page.getByText("Pick her personality")).toBeVisible()
    await expect(page.getByText('Answer 3 questions')).toBeVisible()
  })

  test('renders final CTA section', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Stop doing SDR work yourself.')).toBeVisible()
    await expect(page.getByText('No credit card required')).toBeVisible()
  })

  test('renders footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('© 2026 jamie@work')).toBeVisible()
    await expect(page.getByText('AI digital employees for startups')).toBeVisible()
  })

  test('How It Works anchor link scrolls to section', async ({ page }) => {
    await page.goto('/')

    const howLink = page.getByRole('link', { name: 'How It Works' })
    await howLink.click()

    // The how-it-works section should be in viewport
    const section = page.locator('#how-it-works')
    await expect(section).toBeVisible()
  })

  test('nav is fixed and visible', async ({ page }) => {
    await page.goto('/')

    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Scroll down and verify nav stays visible
    await page.evaluate(() => window.scrollTo(0, 1000))
    await expect(nav).toBeVisible()
  })

  test('all Hire Jamie CTAs point to /register', async ({ page }) => {
    await page.goto('/')

    const hireLinks = page.getByRole('link', { name: /Hire/ })
    const count = await hireLinks.count()
    expect(count).toBeGreaterThanOrEqual(2)

    for (let i = 0; i < count; i++) {
      await expect(hireLinks.nth(i)).toHaveAttribute('href', '/register')
    }
  })
})
