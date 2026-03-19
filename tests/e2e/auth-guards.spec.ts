import { test, expect } from '@playwright/test'
import {
  SUPABASE_URL,
  TEST_USER,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from './helpers'

test.describe('Auth Guards & Route Protection', () => {
  test('unauthenticated user accessing /dashboard is redirected to /register', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/register/)
  })

  test('authenticated user accessing /register is redirected to /dashboard', async ({ page }) => {
    await mockAuthenticatedUser(page)
    await page.goto('/register')

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('landing page Hire Jamie button links to /register', async ({ page }) => {
    await page.goto('/')

    // Nav "Hire Jamie" button
    const navHireBtn = page.locator('nav').getByRole('link', { name: /Hire Jamie/ })
    await expect(navHireBtn).toHaveAttribute('href', '/register')
  })

  test('landing page hero CTA links to /register', async ({ page }) => {
    await page.goto('/')

    const heroCTA = page.getByRole('link', { name: /Hire Jamie — Free to Start/ })
    await expect(heroCTA).toHaveAttribute('href', '/register')
  })

  test('landing page bottom CTA links to /register', async ({ page }) => {
    await page.goto('/')

    const bottomCTA = page.getByRole('link', { name: /Hire SDR Jamie/ })
    await expect(bottomCTA).toHaveAttribute('href', '/register')
  })

  test('landing page Dashboard button links to /dashboard', async ({ page }) => {
    await page.goto('/')

    const dashBtn = page.locator('nav').getByRole('link', { name: /Dashboard/ })
    await expect(dashBtn).toHaveAttribute('href', '/dashboard')
  })

  test('unauthenticated user clicking Dashboard is redirected to /register', async ({ page }) => {
    await mockUnauthenticatedUser(page)
    await page.goto('/')

    await page.locator('nav').getByRole('link', { name: /Dashboard/ }).click()
    await expect(page).toHaveURL(/\/register/)
  })
})
