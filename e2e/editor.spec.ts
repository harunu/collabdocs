/**
 * Editor spec — Tiptap rich text editing, slash commands, toolbar, title, autosave.
 */
import { test, expect } from '@playwright/test'
import { loginAs, createDocumentViaApi, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './helpers'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

test.beforeEach(async ({ page }) => {
  await loginAs(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
})

async function openFreshDoc(page: Parameters<typeof loginAs>[0]) {
  const docId = await createDocumentViaApi(page, `Editor Test ${Date.now()}`)
  await page.goto(`${BASE_URL}/workspace/${docId}`)
  await page.waitForSelector('.ProseMirror', { timeout: 15000 })
  return docId
}

test.describe('T-EDIT-01: Editor renders', () => {
  test('ProseMirror editor is present after opening a document', async ({ page }) => {
    await openFreshDoc(page)
    await expect(page.locator('.ProseMirror')).toBeVisible()
  })
})

test.describe('T-EDIT-02: Placeholder text', () => {
  test('shows placeholder when editor is empty', async ({ page }) => {
    await openFreshDoc(page)
    const placeholder = page.locator('.ProseMirror p.is-editor-empty')
    await expect(placeholder).toBeVisible()
  })
})

test.describe('T-EDIT-03: Type content', () => {
  test('typing in editor shows the text', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Hello collabdocs!')
    await expect(page.locator('.ProseMirror')).toContainText('Hello collabdocs!')
  })
})

test.describe('T-EDIT-04: Toolbar Bold', () => {
  test('clicking Bold button toggles bold format', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Bold text')
    await page.keyboard.press('Control+a')
    await page.getByRole('button', { name: 'B' }).click()
    await expect(page.locator('.ProseMirror strong')).toBeVisible()
  })
})

test.describe('T-EDIT-05: Toolbar Italic', () => {
  test('clicking Italic button toggles italic format', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('Italic text')
    await page.keyboard.press('Control+a')
    await page.getByRole('button', { name: 'I', exact: true }).click()
    await expect(page.locator('.ProseMirror em')).toBeVisible()
  })
})

test.describe('T-EDIT-06: Toolbar H1', () => {
  test('clicking H1 creates a heading level 1', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.getByRole('button', { name: 'H1' }).click()
    await page.keyboard.type('My Heading')
    await expect(page.locator('.ProseMirror h1')).toContainText('My Heading')
  })
})

test.describe('T-EDIT-07: Toolbar H2', () => {
  test('clicking H2 creates a heading level 2', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.getByRole('button', { name: 'H2' }).click()
    await page.keyboard.type('Sub Heading')
    await expect(page.locator('.ProseMirror h2')).toContainText('Sub Heading')
  })
})

test.describe('T-EDIT-08: Toolbar H3', () => {
  test('clicking H3 creates a heading level 3', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.getByRole('button', { name: 'H3' }).click()
    await page.keyboard.type('Small Heading')
    await expect(page.locator('.ProseMirror h3')).toContainText('Small Heading')
  })
})

test.describe('T-EDIT-09: Toolbar Bullet List', () => {
  test('clicking Bullet List creates a list', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.getByRole('button', { name: '• List' }).click()
    await page.keyboard.type('List item one')
    await expect(page.locator('.ProseMirror ul li')).toContainText('List item one')
  })
})

test.describe('T-EDIT-10: Toolbar Code Block', () => {
  test('clicking Code Block creates a code block', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.getByRole('button', { name: '</> Code' }).click()
    await page.keyboard.type('const x = 1;')
    await expect(page.locator('.ProseMirror pre code')).toContainText('const x = 1;')
  })
})

test.describe('T-EDIT-11: Slash command popup', () => {
  test('typing / shows the slash command popup', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('/')
    // Tippy popup should appear with command items
    await expect(page.getByText('Heading 1').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Bullet List').first()).toBeVisible()
    await expect(page.getByText('Code Block').first()).toBeVisible()
  })
})

test.describe('T-EDIT-12: Slash command inserts Heading 1', () => {
  test('/heading selects Heading 1 and inserts it, removes the / character', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('/heading')
    await page.getByText('Heading 1').first().click()
    await page.keyboard.type('Slash H1')
    await expect(page.locator('.ProseMirror h1')).toContainText('Slash H1')
    // The / character should be gone
    await expect(page.locator('.ProseMirror')).not.toContainText('/heading')
  })
})

test.describe('T-EDIT-13: Slash command inserts Code Block', () => {
  test('/code inserts a code block', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('/code')
    await page.getByText('Code Block').first().click()
    await page.keyboard.type('print("hello")')
    await expect(page.locator('.ProseMirror pre')).toBeVisible()
  })
})

test.describe('T-EDIT-14: Slash command keyboard navigation', () => {
  test('ArrowDown + Enter selects second item', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('/')
    await page.waitForSelector('text=Heading 1', { timeout: 5000 })
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    // Second item is Heading 2
    await page.keyboard.type('Keyboard Nav H2')
    await expect(page.locator('.ProseMirror h2')).toContainText('Keyboard Nav H2')
  })
})

test.describe('T-EDIT-15: Slash command Escape closes popup', () => {
  test('pressing Escape dismisses the slash command popup', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('/')
    await page.waitForSelector('text=Heading 1', { timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.getByText('Heading 1')).toHaveCount(0, { timeout: 3000 })
  })
})

test.describe('T-EDIT-16: Slash command filter by query', () => {
  test('/bullet filters to show Bullet List only', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.keyboard.type('/bullet')
    await expect(page.getByText('Bullet List').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Heading 1')).toHaveCount(0)
  })
})

test.describe('T-EDIT-17: Toolbar active state', () => {
  test('H1 button is highlighted when cursor is inside a heading', async ({ page }) => {
    await openFreshDoc(page)
    await page.locator('.ProseMirror').click()
    await page.getByRole('button', { name: 'H1' }).click()
    await page.keyboard.type('Active State Test')

    const h1Btn = page.getByRole('button', { name: 'H1' })
    await expect(h1Btn).toHaveClass(/text-indigo-600|bg-indigo-100/)
  })
})

test.describe('T-EDIT-18: Document title editing', () => {
  test('editing the title input updates the title', async ({ page }) => {
    await openFreshDoc(page)
    const titleInput = page.locator('input[placeholder="Untitled"]')
    await titleInput.click()
    await titleInput.fill('My Custom Title')
    // Wait for debounce to fire
    await page.waitForTimeout(2000)
    // Reload and check title persisted in sidebar
    await page.reload()
    await expect(page.getByText('My Custom Title').first()).toBeVisible({ timeout: 8000 })
  })
})

test.describe('T-EDIT-19: Connection status dot', () => {
  test('shows a connection status indicator in the editor header', async ({ page }) => {
    await openFreshDoc(page)
    // Green or yellow dot indicating WS connection state
    const dot = page.locator('.w-2.h-2.rounded-full')
    await expect(dot).toBeVisible()
  })
})

test.describe('T-EDIT-20: Multiple paragraph types', () => {
  test('can create heading, paragraph, bullet, and code block in one doc', async ({ page }) => {
    await openFreshDoc(page)
    const editor = page.locator('.ProseMirror')
    await editor.click()

    // H1
    await page.getByRole('button', { name: 'H1' }).click()
    await page.keyboard.type('Main Title')
    await page.keyboard.press('Enter')

    // After Enter in h1, cursor is already in a new paragraph
    await page.keyboard.type('A paragraph here.')
    await page.keyboard.press('Enter')

    // Bullet list
    await page.getByRole('button', { name: '• List' }).click()
    await page.keyboard.type('Bullet item')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter') // exit list

    // Code block
    await page.getByRole('button', { name: '</> Code' }).click()
    await page.keyboard.type('code here')

    await expect(editor.locator('h1')).toContainText('Main Title')
    await expect(editor.locator('p').first()).toContainText('A paragraph here.')
    await expect(editor.locator('ul li')).toContainText('Bullet item')
    await expect(editor.locator('pre')).toContainText('code here')
  })
})
