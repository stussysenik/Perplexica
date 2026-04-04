import { test, expect } from '@playwright/test';

test.describe('Navigation Flows', () => {
  test('should navigate between Home, Discover, and Library without being blocked', async ({ page, isMobile }) => {
    await page.goto('/');

    // Wait for the home page to load
    await expect(page).toHaveTitle(/Perplexica/i);

    // Ensure the message input is unblocked and visible
    const chatInput = page.locator('textarea[placeholder="Ask anything..."]');
    await expect(chatInput).toBeVisible();

    if (isMobile) {
      // In mobile, we might need to rely on the bottom nav bar visibility or links directly
      const discoverLink = page.getByRole('link', { name: 'Discover' });
      const libraryLink = page.getByRole('link', { name: 'Library' });
      await expect(discoverLink).toBeVisible();
      await expect(libraryLink).toBeVisible();
      
      await libraryLink.click();
    } else {
      // Larger screens use the side menu
      await page.getByRole('link', { name: 'Library', exact: true }).click();
    }

    // Verify the Library page
    await expect(page.locator('h1', { hasText: 'Library' })).toBeVisible();
    await expect(page.locator('text=Past chats, sources, and uploads.')).toBeVisible();

    // Navigate to Discover
    await page.getByRole('link', { name: 'Discover' }).click();

    // Verify the Discover page loads without errors
    await expect(page.locator('text=Discover')).toBeVisible();
  });
});
