import { test, expect } from '@playwright/test';

test.describe('Discover Page', () => {
  test('renders the Discover page heading and category tabs', async ({ page }) => {
    await page.goto('/discover');

    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();

    // Tabs are role="tab": Research / Analysis / Discovery.
    await expect(page.getByRole('tab', { name: 'Research' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Analysis' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Discovery' })).toBeVisible();
  });

  test('clicking a different tab switches the active selection', async ({ page }) => {
    await page.goto('/discover');

    const research = page.getByRole('tab', { name: 'Research' });
    const analysis = page.getByRole('tab', { name: 'Analysis' });

    await expect(research).toHaveAttribute('aria-selected', 'true');

    await analysis.click();
    await expect(analysis).toHaveAttribute('aria-selected', 'true');
    await expect(research).toHaveAttribute('aria-selected', 'false');
  });

  test('topic suggestions render and route to a search', async ({ page }) => {
    await page.goto('/discover');

    // Each suggestion is a button that navigates to the home search with ?q=.
    // The default Research tab leads with this prompt.
    const suggestion = page.getByRole('button', {
      name: 'How does quantum entanglement work?',
    });
    await expect(suggestion).toBeVisible({ timeout: 5000 });

    await suggestion.click();
    await expect(page).toHaveURL(/\/\?q=/);
  });
});
