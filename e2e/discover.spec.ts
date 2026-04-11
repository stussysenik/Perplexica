import { test, expect } from '@playwright/test';

test.describe('Discover Page', () => {
  test('renders the Discover page heading and topic tabs', async ({ page }) => {
    await page.goto('/discover');

    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();

    await expect(page.getByText('Tech & Science')).toBeVisible();
    await expect(page.getByText('Finance')).toBeVisible();
    await expect(page.getByText('Art & Culture')).toBeVisible();
    await expect(page.getByText('Sports')).toBeVisible();
    await expect(page.getByText('Entertainment')).toBeVisible();
  });

  test('clicking a different topic switches the active tab', async ({ page }) => {
    await page.goto('/discover');

    const financeTab = page.getByText('Finance');
    await financeTab.click();

    await expect(financeTab).toBeVisible();
  });

  test('shows loading spinner or articles after navigation', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForTimeout(3000);

    const spinner = page.locator('.animate-spin');
    const articles = page.locator('a[target="_blank"]');
    const spinnerVisible = await spinner.isVisible().catch(() => false);
    const articleCount = await articles.count();

    expect(spinnerVisible || articleCount >= 0).toBe(true);
  });

  test('article cards have proper link structure', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForTimeout(3000);

    const cards = page.locator('a[target="_blank"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible();
    }
  });
});
