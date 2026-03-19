import { test, expect } from '@playwright/test'
import {
  SUPABASE_URL,
  TEST_USER,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from './helpers'

test.describe('Login Flow', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await mockUnauthenticatedUser(page)

    // Mock successful sign-in
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

    await page.goto('/register')
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: /Log In →/ }).click()

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 })
  })

  test('login with wrong password shows error', async ({ page }) => {
    await mockUnauthenticatedUser(page)

    // Mock failed sign-in
    await page.route(`${SUPABASE_URL}/auth/v1/token*`, route =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid login credentials', message: 'Invalid login credentials' }),
      })
    )

    await page.goto('/register')
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /Log In →/ }).click()

    await expect(page.getByText(/Invalid login credentials/)).toBeVisible({ timeout: 5000 })
  })

  test('login button shows loading state', async ({ page }) => {
    await mockUnauthenticatedUser(page)

    // Delay the token response to observe loading state
    await page.route(`${SUPABASE_URL}/auth/v1/token*`, async route => {
      await new Promise(r => setTimeout(r, 1000))
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid login credentials', message: 'Invalid login credentials' }),
      })
    })

    await page.goto('/register')
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill('somepassword')
    await page.getByRole('button', { name: /Log In →/ }).click()

    // Button should show loading text
    await expect(page.getByRole('button', { name: /Logging in/ })).toBeVisible()
  })

  test('Enter key submits the login form', async ({ page }) => {
    await mockUnauthenticatedUser(page)

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

    await page.goto('/register')
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByLabel('Password').press('Enter')

    await page.waitForURL('/dashboard', { timeout: 5000 })
  })

  test('login submit disabled when email is empty', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.getByLabel('Password').fill('somepassword')

    const submitBtn = page.getByRole('button', { name: /Log In →/ })
    await expect(submitBtn).toBeDisabled()
  })

  test('login submit disabled when password is empty', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.getByLabel('Email').fill(TEST_USER.email)

    const submitBtn = page.getByRole('button', { name: /Log In →/ })
    await expect(submitBtn).toBeDisabled()
  })
})
