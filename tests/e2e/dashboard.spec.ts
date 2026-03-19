import { test, expect } from '@playwright/test'
import {
  SUPABASE_URL,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from './helpers'

test.describe('Dashboard', () => {
  test('renders dashboard content for authenticated user', async ({ page }) => {
    await mockAuthenticatedUser(page)
    await page.goto('/dashboard')

    await expect(page.getByText('Jamie is ready')).toBeVisible()
    await expect(page.getByText(/Complete onboarding/)).toBeVisible()
    await expect(page.getByRole('link', { name: /Start Onboarding/ })).toBeVisible()
  })

  test('shows DASHBOARD badge in navbar', async ({ page }) => {
    await mockAuthenticatedUser(page)
    await page.goto('/dashboard')

    await expect(page.getByText('DASHBOARD')).toBeVisible()
  })

  test('Start Onboarding button links to /onboarding', async ({ page }) => {
    await mockAuthenticatedUser(page)
    await page.goto('/dashboard')

    const onboardingLink = page.getByRole('link', { name: /Start Onboarding/ })
    await expect(onboardingLink).toHaveAttribute('href', '/onboarding')
  })

  test('logo links back to home', async ({ page }) => {
    await mockAuthenticatedUser(page)
    await page.goto('/dashboard')

    await page.getByRole('link', { name: /jamie/ }).click()
    await expect(page).toHaveURL('/')
  })

  test('logout button signs out and redirects to home', async ({ page }) => {
    await mockAuthenticatedUser(page)

    // Mock the signOut endpoint
    await page.route(`${SUPABASE_URL}/auth/v1/logout`, route =>
      route.fulfill({ status: 204, body: '' })
    )

    await page.goto('/dashboard')

    await page.getByRole('button', { name: /Log out/ }).click()

    // Should redirect to home
    await page.waitForURL('/', { timeout: 5000 })
  })

  test('shows robot emoji', async ({ page }) => {
    await mockAuthenticatedUser(page)
    await page.goto('/dashboard')

    // The robot emoji should be visible
    await expect(page.locator('text=🤖')).toBeVisible()
  })
})
