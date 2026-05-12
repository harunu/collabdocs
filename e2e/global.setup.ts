import { test as setup, request as playwrightRequest } from '@playwright/test'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@collabdocs.test'
const TEST_USER_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!'
const TEST_USER_2_EMAIL = process.env.E2E_TEST_EMAIL_2 ?? 'e2e-test2@collabdocs.test'
const TEST_USER_2_PASSWORD = process.env.E2E_TEST_PASSWORD_2 ?? 'TestPassword123!'

async function ensureUser(email: string, password: string): Promise<void> {
  const ctx = await playwrightRequest.newContext()

  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    data: { email, password, email_confirm: true },
  })

  const status = res.status()
  const body = await res.text().catch(() => '')
  await ctx.dispose()

  if (status === 200 || status === 201) {
    console.log(`[Setup] Created user: ${email}`)
  } else if (status === 422 || status === 409) {
    console.log(`[Setup] User already exists: ${email}`)
  } else {
    console.warn(`[Setup] Unexpected ${status} for ${email}: ${body}`)
  }
}

/**
 * Delete all documents owned by a test user so accumulated docs from prior
 * runs don't slow down tests or cause strict-mode violations.
 */
async function cleanupUserDocuments(email: string): Promise<void> {
  const ctx = await playwrightRequest.newContext()

  try {
    // Resolve email → user ID via admin users list
    const usersRes = await ctx.get(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    if (!usersRes.ok()) return

    const body = JSON.parse(await usersRes.text()) as {
      users?: { id: string; email: string }[]
    }
    const users = body.users ?? []
    const user = users.find((u) => u.email === email)
    if (!user) return

    // Hard-delete all documents (active + trashed) via PostgREST admin filter
    await ctx.delete(
      `${SUPABASE_URL}/rest/v1/documents?owner_id=eq.${user.id}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal',
        },
      },
    )

    console.log(`[Setup] Cleaned up documents for ${email}`)
  } catch (err) {
    console.warn(`[Setup] Document cleanup failed for ${email}:`, err)
  } finally {
    await ctx.dispose()
  }
}

setup('ensure test users exist', async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for e2e setup')
  }

  await ensureUser(TEST_USER_EMAIL, TEST_USER_PASSWORD)
  await ensureUser(TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD)

  // Wipe documents from previous runs so the sidebar stays fast and
  // count-based assertions don't break as docs accumulate.
  await cleanupUserDocuments(TEST_USER_EMAIL)
  await cleanupUserDocuments(TEST_USER_2_EMAIL)

  console.log('[Setup] Test users ready.')
})
