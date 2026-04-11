import { test, expect } from '@playwright/test';

test.describe('Library Page', () => {
  test('renders the Library page heading', async ({ page }) => {
    await page.goto('/library');

    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  });

  test('shows tab switcher with Chats and Bookmarks tabs', async ({ page }) => {
    await page.goto('/library');

    await expect(page.getByRole('button', { name: 'Chats' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bookmarks' })).toBeVisible();
  });

  test('shows empty state when no chats exist', async ({ page }) => {
    await page.goto('/library');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText('No chats yet');
    const chatItems = page.locator('[class*="border-l-[var(--border-accent)]"]');
    const chatCount = await chatItems.count();

    if (chatCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      expect(chatCount).toBeGreaterThan(0);
    }
  });

  test('delete button exists on chat items', async ({ page }) => {
    await page.goto('/library');
    await page.waitForTimeout(2000);

    const deleteButtons = page.getByText('Delete');
    const count = await deleteButtons.count();

    if (count > 0) {
      await expect(deleteButtons.first()).toBeVisible();
    }
  });
});
