import { Page, request as playwrightRequest } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''

export const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@collabdocs.test'
export const TEST_USER_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!'
export const TEST_USER_2_EMAIL = process.env.E2E_TEST_EMAIL_2 ?? 'e2e-test2@collabdocs.test'
export const TEST_USER_2_PASSWORD = process.env.E2E_TEST_PASSWORD_2 ?? 'TestPassword123!'

/**
 * Sign in a user via Supabase REST API and inject the session into the browser.
 * Much faster than going through the UI login form every test.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  const ctx = await playwrightRequest.newContext()

  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    data: { email, password },
  })

  const status = res.status()
  const body = await res.text().catch(() => '')
  await ctx.dispose()

  if (!res.ok()) {
    throw new Error(`Login failed for ${email}: ${status} ${body}`)
  }

  const session = JSON.parse(body) as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    user: { id: string; email: string }
  }

  // Navigate to base URL first so we can access localStorage
  await page.goto(BASE_URL)

  // Inject Supabase session into localStorage
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`

  await page.evaluate(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value)
    },
    { key: storageKey, value: JSON.stringify(session) }
  )

  // Navigate to workspace with session in place
  await page.goto(`${BASE_URL}/workspace`)
  await page.waitForURL('**/workspace**', { timeout: 10000 })
  // Wait for workspace to finish loading (sidebar renders after documents are fetched)
  await page.locator('aside').waitFor({ timeout: 10000 })
}

/**
 * Sign up a new user via Supabase REST API. Used in setup only.
 */
export async function signUpUser(email: string, password: string): Promise<void> {
  const ctx = await playwrightRequest.newContext()

  await ctx.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    data: { email, password },
  })

  await ctx.dispose()
}

/**
 * Create a document via API and return its ID. Requires a valid session page.
 */
export async function createDocumentViaApi(page: Page, title: string): Promise<string> {
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`

  const token = await page.evaluate((key: string) => {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { access_token: string }
    return parsed.access_token
  }, storageKey)

  if (!token) throw new Error('No auth token found in localStorage')

  const apiUrl = process.env.VITE_API_URL ?? 'http://localhost:3001'
  const ctx = await playwrightRequest.newContext()

  const res = await ctx.post(`${apiUrl}/api/documents`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: { title },
  })

  const docBody = await res.text().catch(() => '{}')
  await ctx.dispose()

  const doc = JSON.parse(docBody) as { id: string }
  return doc.id
}
