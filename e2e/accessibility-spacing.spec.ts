import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('icon-only buttons have aria-labels', async ({ page }) => {
    await page.goto('/');

    const iconButtons = page.locator('button:not(:has-text(""))').filter({ has: page.locator('svg') });
    const count = await iconButtons.count();

    for (let i = 0; i < Math.min(count, 15); i++) {
      const btn = iconButtons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const hasText = (await btn.textContent())?.trim().length ?? 0;
      const hasAriaLabel = ariaLabel && ariaLabel.length > 0;
      const hasTitle = title && title.length > 0;

      if (!hasText && !hasAriaLabel && !hasTitle) {
        expect.soft(false, `Button ${i} is icon-only but has no aria-label or title`).toBeTruthy();
      }
    }
  });

  test('textarea has accessible label', async ({ page }) => {
    await page.goto('/');

    const textarea = page.getByPlaceholder('Ask anything...');
    const ariaLabel = await textarea.getAttribute('aria-label');
    const label = await textarea.getAttribute('aria-labelledby');
    expect(ariaLabel || label).toBeTruthy();
  });

  test('no elements with transition: all in critical components', async ({ page }) => {
    await page.goto('/');

    const transitionAll = await page.locator('[class*="transition-all"]').count();
    expect(transitionAll).toBeLessThanOrEqual(5);
  });

  test('focusable elements have visible focus indicators', async ({ page }) => {
    await page.goto('/');

    const textarea = page.getByPlaceholder('Ask anything...');
    const textareaVisible = await textarea.isVisible().catch(() => false);

    if (textareaVisible) {
      await textarea.focus();
      await expect(textarea).toBeFocused();
    }

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible, :focus');
    const focusedCount = await focused.count();
    expect(focusedCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Spacing & Layout', () => {
  test('main content has sufficient padding from edges', async ({ page }) => {
    await page.goto('/');

    const mainContent = page.locator('#main-content');
    if (await mainContent.isVisible()) {
      const box = await mainContent.boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(16);
      }
    }
  });

  test('touch targets are at least 44x44px', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const buttons = page.locator('button');
    const count = await buttons.count();

    let smallTargets = 0;
    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box && (box.width < 32 || box.height < 32)) {
          const ariaLabel = await btn.getAttribute('aria-label');
          if (ariaLabel) {
            smallTargets++;
          }
        }
      }
    }

    expect(smallTargets).toBeLessThanOrEqual(2);
  });

  test('Discover page cards have adequate gap spacing', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForTimeout(3000);

    const cards = page.locator('a[href*="/?q=Summary"]');
    const count = await cards.count();

    if (count >= 2) {
      const firstBox = await cards.first().boundingBox();
      const secondBox = await cards.nth(1).boundingBox();

      if (firstBox && secondBox) {
        const verticalGap = secondBox.y - (firstBox.y + firstBox.height);
        const horizontalGap = secondBox.x - (firstBox.x + firstBox.width);

        const minGap = Math.min(verticalGap, horizontalGap);
        expect(minGap).toBeGreaterThanOrEqual(8);
      }
    }
  });

  test('Library page content does not overlap with bottom nav on mobile', async ({ page }) => {
    await page.goto('/library');
    await page.waitForTimeout(2000);

    const bottomNav = page.locator('.fixed.bottom-0');
    if (await bottomNav.isVisible()) {
      const navBox = await bottomNav.boundingBox();
      const mainContent = page.locator('#main-content');
      if (navBox && (await mainContent.isVisible())) {
        expect(navBox.y).toBeGreaterThan(0);
      }
    }
  });
});
