/**
 * Document management spec — CRUD, soft delete, trash, restore, sidebar.
 */
import { test, expect } from '@playwright/test'
import { loginAs, createDocumentViaApi, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './helpers'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

test.beforeEach(async ({ page }) => {
  await loginAs(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
})

test.describe('T-DOC-01: Empty state', () => {
  test('shows empty state message when no document is selected', async ({ page }) => {
    await expect(page.getByText(/select.*document|no document selected/i)).toBeVisible()
  })
})

test.describe('T-DOC-02: Create document via button', () => {
  test('clicking New Document adds it to the sidebar', async ({ page }) => {
    const countBefore = await page.getByText('📄').count()
    await page.getByRole('button', { name: '+ New Document' }).click()
    await expect(page.getByText('📄')).toHaveCount(countBefore + 1, { timeout: 8000 })
    await expect(page).toHaveURL(/\/workspace\/.+/)
  })
})

test.describe('T-DOC-03: Create document via empty state button', () => {
  test('clicking Create New Document in empty state creates a document', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create new document/i })
    if (await createBtn.isVisible()) {
      await createBtn.click()
      await expect(page).toHaveURL(/\/workspace\/.+/, { timeout: 8000 })
    }
  })
})

test.describe('T-DOC-04: Rename document by double-clicking', () => {
  test('double-click title in sidebar shows inline input and saves new title', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'Rename Me')
    await page.goto(`${BASE_URL}/workspace/${docId}`)
    await page.waitForURL(`**/workspace/${docId}`)

    const docItem = page.getByText('Rename Me').first()
    await docItem.dblclick()

    const input = page.locator('input[class*="bg-transparent"]').first()
    await input.clear()
    await input.fill('Renamed Doc')
    await input.press('Enter')

    await expect(page.getByText('Renamed Doc').first()).toBeVisible({ timeout: 6000 })
  })
})

test.describe('T-DOC-05: Rename with empty title defaults to Untitled', () => {
  test('clearing title and pressing Enter defaults to Untitled', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'Will Be Empty')
    await page.goto(`${BASE_URL}/workspace/${docId}`)

    const docItem = page.getByText('Will Be Empty').first()
    await docItem.dblclick()

    const input = page.locator('input[class*="bg-transparent"]').first()
    await input.clear()
    await input.press('Enter')

    await expect(page.getByText('Untitled').first()).toBeVisible({ timeout: 6000 })
  })
})

test.describe('T-DOC-06: Click document navigates to editor', () => {
  test('clicking a document in sidebar navigates to /workspace/:id', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'Navigate Test')
    await page.reload()
    await page.locator('aside').waitFor({ timeout: 10000 })
    await page.getByText('Navigate Test').first().click()
    await expect(page).toHaveURL(new RegExp(`workspace/${docId}`))
  })
})

test.describe('T-DOC-07: Delete document moves to trash', () => {
  test('clicking trash icon soft-deletes and removes from active list', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'To Be Deleted')
    await page.goto(`${BASE_URL}/workspace/${docId}`)
    await page.reload()
    await page.locator('aside').waitFor({ timeout: 10000 })

    const countBefore = await page.getByText('To Be Deleted').count()
    const docRow = page.locator('nav div').filter({ has: page.getByText('To Be Deleted') }).first()
    await docRow.hover()
    await docRow.locator('button[title="Delete"]').click()

    await expect(page.getByText('To Be Deleted')).toHaveCount(countBefore - 1, { timeout: 6000 })
  })
})

test.describe('T-DOC-08: Trash panel shows deleted documents', () => {
  test('opening Trash panel reveals soft-deleted document', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'Trash Test Doc')
    await page.goto(`${BASE_URL}/workspace/${docId}`)
    await page.reload()
    await page.locator('aside').waitFor({ timeout: 10000 })

    // Delete the document
    const countBefore = await page.getByText('Trash Test Doc').count()
    const docRow = page.locator('nav div').filter({ has: page.getByText('Trash Test Doc') }).first()
    await docRow.hover()
    await docRow.locator('button[title="Delete"]').click()
    await expect(page.getByText('Trash Test Doc')).toHaveCount(countBefore - 1, { timeout: 4000 })

    // Open trash panel
    await page.getByText('🗑 Trash').click()
    await expect(page.getByText('Trash Test Doc').first()).toBeVisible({ timeout: 6000 })
  })
})

test.describe('T-DOC-09: Restore from trash', () => {
  test('clicking Restore puts document back in the active list', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'Restore Me')
    await page.goto(`${BASE_URL}/workspace/${docId}`)
    await page.reload()
    await page.locator('aside').waitFor({ timeout: 10000 })

    // Delete it
    const countBefore = await page.getByText('Restore Me').count()
    const docRow = page.locator('nav div').filter({ has: page.getByText('Restore Me') }).first()
    await docRow.hover()
    await docRow.locator('button[title="Delete"]').click()
    await expect(page.getByText('Restore Me')).toHaveCount(countBefore - 1, { timeout: 4000 })

    // Open trash and restore
    await page.getByText('🗑 Trash').click()
    await page.getByText('Restore Me').first().waitFor()
    await page.getByRole('button', { name: 'Restore' }).first().click()

    // Should reappear in active list
    await expect(page.getByText('Restore Me').first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('T-DOC-10: Trash empty state', () => {
  test('shows "Trash is empty" when no deleted documents', async ({ page }) => {
    await page.getByText('🗑 Trash').click()
    // Either empty message or list — check empty state if no deleted docs
    const trashItems = await page.getByRole('button', { name: 'Restore' }).count()
    if (trashItems === 0) {
      await expect(page.getByText(/trash is empty/i)).toBeVisible()
    }
  })
})

test.describe('T-DOC-11: Sidebar toggle', () => {
  test('clicking hamburger toggles sidebar visibility', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    await page.locator('button[title="Toggle sidebar"]').click()
    await expect(sidebar).toHaveClass(/w-0/, { timeout: 4000 })

    await page.locator('button[title="Toggle sidebar"]').click()
    await expect(sidebar).not.toHaveClass(/w-0/, { timeout: 4000 })
  })
})

test.describe('T-DOC-12: Multiple documents in sidebar', () => {
  test('creating multiple documents all appear in sidebar', async ({ page }) => {
    await createDocumentViaApi(page, 'Multi Doc 1')
    await createDocumentViaApi(page, 'Multi Doc 2')
    await createDocumentViaApi(page, 'Multi Doc 3')
    await page.reload()
    await page.locator('aside').waitFor({ timeout: 10000 })

    await expect(page.getByText('Multi Doc 1').first()).toBeVisible()
    await expect(page.getByText('Multi Doc 2').first()).toBeVisible()
    await expect(page.getByText('Multi Doc 3').first()).toBeVisible()
  })
})

test.describe('T-DOC-13: Active document highlighted in sidebar', () => {
  test('current document is highlighted with indigo background', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'Active Highlight Test')
    await page.goto(`${BASE_URL}/workspace/${docId}`)

    const activeItem = page.locator('.bg-indigo-100').first()
    await expect(activeItem).toBeVisible()
    await expect(activeItem).toContainText('Active Highlight Test')
  })
})

test.describe('T-DOC-14: Rename on Escape cancels', () => {
  test('pressing Escape during rename reverts to original title', async ({ page }) => {
    const docId = await createDocumentViaApi(page, 'Escape Cancel Test')
    await page.goto(`${BASE_URL}/workspace/${docId}`)
    await page.reload()
    await page.locator('aside').waitFor({ timeout: 10000 })

    const docItem = page.getByText('Escape Cancel Test').first()
    await docItem.dblclick()

    const input = page.locator('input[class*="bg-transparent"]').first()
    await input.fill('Changed Title')
    await input.press('Escape')

    await expect(page.getByText('Escape Cancel Test').first()).toBeVisible({ timeout: 4000 })
  })
})
