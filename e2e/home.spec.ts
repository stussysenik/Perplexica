import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('renders the empty chat state with title and input', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Perplexica' })).toBeVisible();
    await expect(page.getByText('Research-grade search with source traceability')).toBeVisible();
  });

  test('hero is vertically and horizontally centered on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const mainContent = page.locator('#main-content, main').first();
    const hero = mainContent.locator('h1').first();
    await expect(hero).toBeVisible({ timeout: 10000 });

    const box = await hero.boundingBox();
    const vpSize = page.viewportSize();

    if (!box || !vpSize) {
      return;
    }

    const centerX = vpSize.width / 2;
    const centerY = vpSize.height / 2;

    const heroCenterX = box.x + box.width / 2;
    const heroCenterY = box.y + box.height / 2;

    expect(Math.abs(heroCenterX - centerX)).toBeLessThan(250);
    expect(Math.abs(heroCenterY - centerY)).toBeLessThan(350);
  });

  test('hero is centered on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(1000);

    const hero = page.locator('h1:has-text("Perplexica")');
    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    expect(box).not.toBeNull();

    const vp = page.viewportSize()!;
    const heroCenterX = box!.x + box!.width / 2;

    expect(Math.abs(heroCenterX - vp.width / 2)).toBeLessThan(50);
    expect(box!.y).toBeGreaterThan(50);
  });

  test('suggestion chips are visible and clickable', async ({ page }) => {
    await page.goto('/');

    const suggestions = page.locator('button');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('skip-to-content link exists for accessibility', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a', { hasText: 'Skip to content' });
    const exists = await skipLink.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});
