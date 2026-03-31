import { test, expect } from '@playwright/test'

test.describe('LibraryPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/library')
  })

  test('renders page title', async ({ page }) => {
    await expect(page.getByText('Library')).toBeVisible()
  })

  test('renders Chats and Bookmarks tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Chats' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bookmarks' })).toBeVisible()
  })

  test('Chats tab is active by default', async ({ page }) => {
    const chatsTab = page.getByRole('button', { name: 'Chats' })
    await expect(chatsTab).toHaveClass(/text-accent|font-semibold/)
  })

  test('switching to Bookmarks tab', async ({ page }) => {
    const bookmarksTab = page.getByRole('button', { name: 'Bookmarks' })
    await bookmarksTab.click()
    await expect(bookmarksTab).toHaveClass(/text-accent|font-semibold/)
  })

  test('shows chat count badge', async ({ page }) => {
    // Should show "X chats" badge
    await page.waitForTimeout(2000)
    const badge = page.locator('span', { hasText: /\d+ chats/ })
    await expect(badge).toBeVisible()
  })

  test('empty state shows when no chats', async ({ page }) => {
    await page.waitForTimeout(2000)
    // Either shows chats or empty state
    const hasChats = await page.locator('[class*="cursor-pointer"]').count()
    const hasEmpty = await page.getByText('No chats yet').isVisible().catch(() => false)

    expect(hasChats > 0 || hasEmpty).toBeTruthy()
  })

  test('bookmarks empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Bookmarks' }).click()
    await page.waitForTimeout(2000)

    const hasBookmarks = await page.locator('.space-y-2 > div').count()
    const hasEmpty = await page.getByText('No bookmarks yet').isVisible().catch(() => false)

    expect(hasBookmarks > 0 || hasEmpty).toBeTruthy()
  })
})
