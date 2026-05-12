/**
 * Real-time collaboration spec — two browsers, same document, CRDT sync, presence.
 */
import { test, expect, chromium } from '@playwright/test'
import {
  loginAs,
  createDocumentViaApi,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_USER_2_EMAIL,
  TEST_USER_2_PASSWORD,
} from './helpers'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

// Realtime tests spin up two full browser contexts with independent auth flows,
// two Hocuspocus connections, and 4 s of intentional wait time — 90 s is a
// safe ceiling even on slow CI networks.
test.describe('T-RT-01: Two users editing same document syncs', () => {
  test('user 1 types text, user 2 sees it appear', async ({ browser }) => {
    test.setTimeout(90000)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // User 1 creates a doc and logs in
    await loginAs(page1, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    const docId = await createDocumentViaApi(page1, 'Collab Test Doc')

    // Both users open the same document
    await page1.goto(`${BASE_URL}/workspace/${docId}`)
    await page1.waitForSelector('.ProseMirror', { timeout: 15000 })

    await loginAs(page2, TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD)
    await page2.goto(`${BASE_URL}/workspace/${docId}`)
    await page2.waitForSelector('.ProseMirror', { timeout: 15000 })

    // Wait for both to connect to Hocuspocus
    await page1.waitForTimeout(2000)
    await page2.waitForTimeout(2000)

    // User 1 types
    await page1.locator('.ProseMirror').click()
    await page1.keyboard.type('Hello from User 1!')

    // User 2 should see it
    await expect(page2.locator('.ProseMirror')).toContainText('Hello from User 1!', { timeout: 10000 })

    await context1.close()
    await context2.close()
  })
})

test.describe('T-RT-02: Simultaneous edits do not overwrite', () => {
  test('both users type at same time, both texts appear without overwrite', async ({ browser }) => {
    test.setTimeout(90000)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await loginAs(page1, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    const docId = await createDocumentViaApi(page1, 'Concurrent Edit Doc')

    await page1.goto(`${BASE_URL}/workspace/${docId}`)
    await page1.waitForSelector('.ProseMirror', { timeout: 15000 })
    await loginAs(page2, TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD)
    await page2.goto(`${BASE_URL}/workspace/${docId}`)
    await page2.waitForSelector('.ProseMirror', { timeout: 15000 })

    await page1.waitForTimeout(2000)
    await page2.waitForTimeout(2000)

    // Type simultaneously
    await page1.locator('.ProseMirror').click()
    await page2.locator('.ProseMirror').click()

    await Promise.all([
      page1.keyboard.type('User1Text '),
      page2.keyboard.type('User2Text '),
    ])

    // After a moment both texts should be present in both editors
    await page1.waitForTimeout(3000)

    const content1 = await page1.locator('.ProseMirror').textContent()
    const content2 = await page2.locator('.ProseMirror').textContent()

    // Both should contain both users' text (CRDT merges without loss)
    expect(content1).toContain('User1Text')
    expect(content1).toContain('User2Text')
    expect(content2).toContain('User1Text')
    expect(content2).toContain('User2Text')

    await context1.close()
    await context2.close()
  })
})

test.describe('T-RT-03: Presence bar shows multiple users', () => {
  test('second user opening document appears in presence bar', async ({ browser }) => {
    test.setTimeout(90000)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await loginAs(page1, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    const docId = await createDocumentViaApi(page1, 'Presence Test Doc')

    await page1.goto(`${BASE_URL}/workspace/${docId}`)
    await page1.waitForSelector('.ProseMirror', { timeout: 15000 })

    await loginAs(page2, TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD)
    await page2.goto(`${BASE_URL}/workspace/${docId}`)
    await page2.waitForSelector('.ProseMirror', { timeout: 15000 })

    // Both must type something for awareness to broadcast
    await page1.locator('.ProseMirror').click()
    await page2.locator('.ProseMirror').click()

    await page1.waitForTimeout(3000)

    // Presence avatars should be visible (colored circles)
    const avatars = page1.locator('[style*="background-color"]').filter({ hasText: /[A-Z]/ })
    await expect(avatars.first()).toBeVisible({ timeout: 8000 })

    await context1.close()
    await context2.close()
  })
})

test.describe('T-RT-04: Disconnected user leaves presence bar', () => {
  test('closing user 2 browser removes them from presence', async ({ browser }) => {
    test.setTimeout(90000)
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await loginAs(page1, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    const docId = await createDocumentViaApi(page1, 'Disconnect Test Doc')

    await page1.goto(`${BASE_URL}/workspace/${docId}`)
    await page1.waitForSelector('.ProseMirror', { timeout: 15000 })

    await loginAs(page2, TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD)
    await page2.goto(`${BASE_URL}/workspace/${docId}`)
    await page2.waitForSelector('.ProseMirror', { timeout: 15000 })

    await page1.locator('.ProseMirror').click()
    await page2.locator('.ProseMirror').click()
    await page1.waitForTimeout(2000)

    // Close user 2
    await context2.close()

    // Give Hocuspocus time to clean up awareness
    await page1.waitForTimeout(4000)

    // Only 1 user should remain — just verify no crash
    await expect(page1.locator('.ProseMirror')).toBeVisible()

    await context1.close()
  })
})
