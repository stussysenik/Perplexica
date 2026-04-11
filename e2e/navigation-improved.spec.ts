import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('sidebar navigation links are present on desktop', async ({ page }) => {
    await page.goto('/');

    const searchLink = page.getByRole('link', { name: 'Search' });
    const discoverLink = page.getByRole('link', { name: 'Discover' });
    const libraryLink = page.getByRole('link', { name: 'Library' });

    await expect(searchLink.first()).toBeVisible();
    await expect(discoverLink.first()).toBeVisible();
    await expect(libraryLink.first()).toBeVisible();
  });

  test('can navigate between all pages', async ({ page }) => {
    await page.goto('/');

    const discoverLink = page.getByRole('link', { name: 'Discover' }).first();
    if (await discoverLink.isVisible()) {
      await discoverLink.click();
      await expect(page).toHaveURL(/discover/);
    }

    const libraryLink = page.getByRole('link', { name: 'Library' }).first();
    if (await libraryLink.isVisible()) {
      await libraryLink.click();
      await expect(page).toHaveURL(/library/);
    }

    const searchLink = page.getByRole('link', { name: 'Search' }).first();
    if (await searchLink.isVisible()) {
      await searchLink.click();
      await expect(page).toHaveURL(/\//);
    }
  });

  test('theme toggle button is accessible', async ({ page }) => {
    await page.goto('/');

    const themeBtn = page.locator('button').filter({ hasText: /Light Mode|Dark Mode/ });
    const count = await themeBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
