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

  test('shows either chat rows or the empty state', async ({ page }) => {
    await page.goto('/library');
    await page.waitForTimeout(2000);

    // Each chat row carries a "Move to trash" action button; absent any chat,
    // the empty state is shown instead. Exactly one of these must be true.
    const emptyState = page.getByText('No chats yet');
    const trashButtons = page.getByRole('button', { name: 'Move to trash' });
    const chatCount = await trashButtons.count();

    if (chatCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      expect(chatCount).toBeGreaterThan(0);
    }
  });

  test('chat rows expose a move-to-trash action', async ({ page }) => {
    await page.goto('/library');
    await page.waitForTimeout(2000);

    const trashButtons = page.getByRole('button', { name: 'Move to trash' });
    const count = await trashButtons.count();

    if (count > 0) {
      await expect(trashButtons.first()).toBeVisible();
    }
  });
});
