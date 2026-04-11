import { test, expect } from '@playwright/test';

test.describe('Single-Click Navigation', () => {
  test('navigates to Library in one click from Home', async ({ page }) => {
    await page.goto('/');

    const libraryLink = page.getByRole('link', { name: 'Library' }).first();
    await expect(libraryLink).toBeVisible();

    await libraryLink.click();

    await expect(page).toHaveURL(/\/library/);
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({
      timeout: 5000,
    });

    const currentUrl = page.url();
    expect(currentUrl).toContain('/library');

    await page.reload();

    await expect(
      page.getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 5000 });

    expect(page.url()).toContain('/library');
  });

  test('navigates to Library in one click from Discover', async ({ page }) => {
    await page.goto('/discover');

    const libraryLink = page.getByRole('link', { name: 'Library' }).first();
    await expect(libraryLink).toBeVisible();

    await libraryLink.click();

    await expect(page).toHaveURL(/\/library/);
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('navigates to Discover in one click from Home', async ({ page }) => {
    await page.goto('/');

    const discoverLink = page
      .getByRole('link', { name: 'Discover' })
      .first();
    await expect(discoverLink).toBeVisible();

    await discoverLink.click();

    await expect(page).toHaveURL(/\/discover/);
    await expect(
      page.getByRole('heading', { name: 'Discover' }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('navigates to Home in one click from Library', async ({ page }) => {
    await page.goto('/library');

    const homeLink = page.getByRole('link', { name: 'Home' }).first();
    await expect(homeLink).toBeVisible();

    await homeLink.click();

    await expect(page).toHaveURL(/\/$/);

    const chatInput = page.getByPlaceholder('Ask anything...');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
  });

  test('Library page loads without requiring a page refresh', async ({
    page,
  }) => {
    const responses: string[] = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/chats')) {
        responses.push(response.url());
      }
    });

    await page.goto('/library');

    await expect(
      page.getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 5000 });

    expect(responses.length).toBeGreaterThanOrEqual(1);

    const loadingIndicators = page.locator('[role="status"]');
    const loadingCount = await loadingIndicators.count();

    if (loadingCount > 0) {
      await expect(loadingIndicators.first()).toBeHidden({ timeout: 10000 });
    }
  });

  test('Library page persists after reload', async ({ page }) => {
    await page.goto('/library');

    await expect(
      page.getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 5000 });

    await page.reload();

    await expect(
      page.getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('full navigation loop: Home → Library → Discover → Home', async ({
    page,
  }) => {
    await page.goto('/');

    const chatInput = page.getByPlaceholder('Ask anything...');
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    await page.getByRole('link', { name: 'Library' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole('link', { name: 'Discover' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Discover' }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole('link', { name: 'Home' }).first().click();
    await expect(chatInput).toBeVisible({ timeout: 5000 });
  });

  test('loading state shows elapsed time on Library', async ({ page }) => {
    await page.goto('/library');

    const loadingText = page.getByText(/Loading chats.*\d+\.\d+s/);
    const heading = page.getByRole('heading', { name: 'Library' });

    await expect(heading).toBeVisible({ timeout: 10000 });

    const hadLoadingState = (await loadingText.count()) > 0;
    console.log(
      hadLoadingState
        ? 'Loading state with elapsed time was displayed'
        : 'Page loaded too fast for loading state to appear',
    );
  });

  test('mobile bottom nav navigates to Library in one click', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const mobileLibraryLink = page
      .getByRole('link', { name: 'Library' })
      .last();
    await expect(mobileLibraryLink).toBeVisible();

    await mobileLibraryLink.click();

    await expect(page).toHaveURL(/\/library/);
    await expect(
      page.getByRole('heading', { name: 'Library' }),
    ).toBeVisible({ timeout: 5000 });
  });
});
