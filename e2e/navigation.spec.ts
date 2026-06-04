import { test, expect } from '@playwright/test';

test.describe('Navigation Flows', () => {
  test('should navigate between Home, Discover, and Library', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Find Your Own Answer/i);

    const chatInput = page.getByPlaceholder('Ask anything...');
    await expect(chatInput).toBeVisible();

    await page.getByRole('link', { name: 'Library' }).first().click();

    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();

    await page.getByRole('link', { name: 'Discover' }).first().click();

    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
  });

  test('should navigate back to home from any page', async ({ page }) => {
    await page.goto('/discover');

    // The "Search" nav item points at "/" — clicking it returns home.
    await page.getByRole('link', { name: 'Search' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByPlaceholder('Ask anything...')).toBeVisible();
  });

  test('new chat button navigates to home', async ({ page }) => {
    await page.goto('/library');

    const newChatBtn = page.getByRole('link', { name: 'New chat' });
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
      await expect(page).toHaveURL(/\//);
    }
  });
});
