import { test, expect } from '@playwright/test'
import {
  SUPABASE_URL,
  TEST_USER,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockSignUp,
} from './helpers'

test.describe('Registration & Signup', () => {
  test('renders registration form by default', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')

    await expect(page.getByText('Hire your AI SDR')).toBeVisible()
    await expect(page.getByText('Create Account')).toBeVisible()
    await expect(page.getByText('Log In')).toBeVisible()
    await expect(page.getByLabel('Your name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /Get Started/ })).toBeVisible()
  })

  test('submit button is disabled when fields are empty', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')

    const submitBtn = page.getByRole('button', { name: /Get Started/ })
    await expect(submitBtn).toBeDisabled()
  })

  test('submit button enables when email and password are filled', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')

    await page.getByLabel('Email').fill('new@example.com')
    await page.getByLabel('Password').fill('password123')

    const submitBtn = page.getByRole('button', { name: /Get Started/ })
    await expect(submitBtn).toBeEnabled()
  })

  test('successful registration shows email verification message', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await mockSignUp(page)

    // Mock signInWithPassword to fail (email not yet verified)
    await page.route(`${SUPABASE_URL}/auth/v1/token*`, route =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email not confirmed', message: 'Email not confirmed' }),
      })
    )

    await page.goto('/register')

    await page.getByLabel('Your name').fill(TEST_USER.name)
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: /Get Started/ }).click()

    // Should show email verification message
    await expect(page.getByText(/Check your email/)).toBeVisible({ timeout: 5000 })
  })

  test('registration with weak password shows error', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await mockSignUp(page, {
      shouldFail: true,
      errorMessage: 'Password should be at least 6 characters',
    })

    await page.goto('/register')

    await page.getByLabel('Your name').fill('Test')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('123')
    await page.getByRole('button', { name: /Get Started/ }).click()

    await expect(page.getByText(/Password should be at least 6 characters/)).toBeVisible({ timeout: 5000 })
  })

  test('toggle switches to login mode', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')

    await page.getByRole('button', { name: 'Log In' }).click()

    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByText('Log in to manage Jamie')).toBeVisible()
    // Name field should be hidden in login mode
    await expect(page.getByLabel('Your name')).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Log In →/ })).toBeVisible()
  })

  test('toggle switches back to register mode', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')

    await page.getByRole('button', { name: 'Log In' }).click()
    await expect(page.getByText('Welcome back')).toBeVisible()

    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page.getByText('Hire your AI SDR')).toBeVisible()
    await expect(page.getByLabel('Your name')).toBeVisible()
  })

  test('back to home link navigates to landing page', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')

    await page.getByRole('link', { name: /Back to home/ }).click()
    await expect(page).toHaveURL('/')
  })

  test('logo links back to home', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/register')

    await page.getByRole('link', { name: /jamie/ }).click()
    await expect(page).toHaveURL('/')
  })

  test('error clears when toggling between modes', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await mockSignUp(page, { shouldFail: true, errorMessage: 'Something went wrong' })

    await page.goto('/register')

    // Trigger an error
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: /Get Started/ }).click()
    await expect(page.getByText('Something went wrong')).toBeVisible({ timeout: 5000 })

    // Toggle to login — error should clear
    await page.getByRole('button', { name: 'Log In' }).click()
    await expect(page.getByText('Something went wrong')).not.toBeVisible()
  })
})
