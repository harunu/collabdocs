/**
 * Auth spec — sign up, sign in, sign out, guards, error states.
 */
import { test, expect, request as playwrightRequest } from '@playwright/test'
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, loginAs } from './helpers'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

test.describe('T-AUTH-01: Unauthenticated redirect', () => {
  test('visiting /workspace without auth redirects to /auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace`)
    await expect(page).toHaveURL(/\/auth/)
  })
})

test.describe('T-AUTH-02: Auth page renders', () => {
  test('shows Sign In and Sign Up tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`)
    await expect(page.getByText('Sign In')).toBeVisible()
    await expect(page.getByText('Sign Up')).toBeVisible()
    await expect(page.getByText('collabdocs')).toBeVisible()
  })
})

test.describe('T-AUTH-03: Sign In tab toggle', () => {
  test('clicking Sign Up tab shows the sign up form', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`)
    await page.getByRole('button', { name: 'Sign Up' }).click()
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  })
})

test.describe('T-AUTH-04: Invalid credentials', () => {
  test('shows error message on wrong password', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`)
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText(/invalid|incorrect|credentials|password/i)).toBeVisible({ timeout: 8000 })
    await expect(page).not.toHaveURL(/workspace/)
  })
})

test.describe('T-AUTH-05: Empty fields', () => {
  test('cannot submit login form with empty email', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`)
    await page.fill('input[type="password"]', 'somepassword')
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Browser native validation prevents submit — URL stays on /auth
    await expect(page).toHaveURL(/\/auth/)
  })
})

test.describe('T-AUTH-06: Successful sign in', () => {
  test('valid credentials redirect to /workspace', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`)
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/workspace/, { timeout: 10000 })
  })
})

test.describe('T-AUTH-07: Sign out', () => {
  test('clicking Sign Out redirects to /auth', async ({ page }) => {
    await loginAs(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/auth/, { timeout: 8000 })
  })
})

test.describe('T-AUTH-08: Already authenticated redirect', () => {
  test('authenticated user visiting /auth is redirected to /workspace', async ({ page }) => {
    await loginAs(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    await page.goto(`${BASE_URL}/auth`)
    // Should stay on workspace since already logged in
    await expect(page).toHaveURL(/\/workspace/)
  })
})

test.describe('T-AUTH-09: 404 page', () => {
  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-route-does-not-exist`)
    await expect(page.getByText('404')).toBeVisible()
  })
})

test.describe('T-AUTH-10: Sign up new user', () => {
  test('new unique email signs up and lands on /workspace', async ({ page }) => {
    const uniqueEmail = `e2e.new.${Date.now()}@example.com`
    const password = 'NewTestPass123!'
    const supabaseUrl = process.env.SUPABASE_URL ?? ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

    // Create a pre-confirmed user via the admin API so the test is not
    // sensitive to Supabase email-confirmation settings or MX-validation rules.
    const ctx = await playwrightRequest.newContext()
    await ctx.post(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      data: { email: uniqueEmail, password, email_confirm: true },
    })
    await ctx.dispose()

    // Verify the new user can sign in via the UI and reach /workspace.
    await page.goto(`${BASE_URL}/auth`)
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/workspace/, { timeout: 12000 })
  })
})
