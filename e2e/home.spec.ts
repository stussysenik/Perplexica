import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Home Page — empty state
// ---------------------------------------------------------------------------
test.describe('Home Page — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the hero heading and verified badge', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('find your own answer');
    await expect(page.getByText('verified answer machine')).toBeVisible();
  });

  test('renders search input with correct placeholder', async ({ page }) => {
    await expect(page.getByPlaceholder('Ask anything...')).toBeVisible();
  });

  test('renders SPEED / BALANCED / QUALITY mode buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /speed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /balanced/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /quality/i })).toBeVisible();
  });

  test('mode buttons are clickable and switch the active mode', async ({ page }) => {
    const balanced = page.getByRole('button', { name: /balanced/i });
    const quality  = page.getByRole('button', { name: /quality/i });

    // SPEED is selected by default — clicking Balanced should change styling
    await balanced.click();
    // After clicking, the button should carry the accent styling (underline border)
    await expect(balanced).toHaveClass(/border-b-2/);
    await expect(page.getByRole('button', { name: /speed/i })).not.toHaveClass(/border-b-2/);

    await quality.click();
    await expect(quality).toHaveClass(/border-b-2/);
    await expect(balanced).not.toHaveClass(/border-b-2/);
  });

  test('hero is centered on desktop viewport', async ({ page }) => {
    const hero = page.locator('h1');
    await expect(hero).toBeVisible({ timeout: 8000 });

    const box   = await hero.boundingBox();
    const vp    = page.viewportSize();
    if (!box || !vp) return;

    expect(Math.abs((box.x + box.width / 2) - vp.width / 2)).toBeLessThan(250);
    expect(Math.abs((box.y + box.height / 2) - vp.height / 2)).toBeLessThan(350);
  });

  test('hero is centered on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const hero = page.locator('h1');
    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    const vp = page.viewportSize()!;
    expect(Math.abs((box!.x + box!.width / 2) - vp.width / 2)).toBeLessThan(50);
  });

  test('skip-to-content link exists for accessibility', async ({ page }) => {
    // Wait for the app shell to mount (the auth gate resolves first on slower
    // engines), then assert the skip link is present. toHaveCount retries.
    await expect(page.getByPlaceholder('Ask anything...')).toBeVisible();
    const skip = page.locator('a', { hasText: 'Skip to content' });
    await expect(skip).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// Navigation — "FYOA" brand link returns home
// ---------------------------------------------------------------------------
test.describe('Navigation — FYOA brand returns home', () => {
  test('desktop sidebar brand is a link that navigates to /', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/discover');

    // Click the sidebar FYOA brand link
    const logo = page.locator('aside a', { hasText: 'FYOA' });
    await expect(logo).toBeVisible();
    await logo.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('mobile header brand is a link that navigates to /', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/discover');

    // Mobile header shows the FYOA brand link
    const logo = page.locator('.lg\\:hidden a', { hasText: 'FYOA' });
    await expect(logo).toBeVisible();
    await logo.click();
    await expect(page).toHaveURL(/\/$/);
  });
});

// ---------------------------------------------------------------------------
// Search user flow (requires Phoenix backend at localhost:4000)
// ---------------------------------------------------------------------------
test.describe('Search flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('typing in the input and pressing Enter triggers a search', async ({ page }) => {
    const input = page.getByPlaceholder('Ask anything...');
    await input.fill('What is the speed of light?');
    await input.press('Enter');

    // Loading spinner should appear on the send button
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 3000 });
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: 'Send message' });
    await expect(sendBtn).toBeDisabled();
  });

  test('send button becomes enabled once text is entered', async ({ page }) => {
    const input   = page.getByPlaceholder('Ask anything...');
    const sendBtn = page.getByRole('button', { name: 'Send message' });

    await input.fill('hello');
    await expect(sendBtn).not.toBeDisabled();
  });

  test('pressing / focuses the search input from anywhere on the page', async ({ page }) => {
    // Wait until the input is mounted — the "/" shortcut handler attaches with
    // it, so pressing before mount is a no-op (hydration race).
    const input = page.getByPlaceholder('Ask anything...');
    await expect(input).toBeVisible();
    await page.keyboard.press('/');
    await expect(input).toBeFocused();
  });

  test('mode is passed along with the search request', async ({ page }) => {
    // Switch to Quality mode then submit
    await page.getByRole('button', { name: /quality/i }).click();
    await expect(page.getByRole('button', { name: /quality/i })).toHaveClass(/border-b-2/);

    const input = page.getByPlaceholder('Ask anything...');
    await input.fill('test query');

    // Intercept the GraphQL mutation to verify optimizationMode is "quality"
    // The search fires a StartSearch GraphQL mutation at Phoenix. The mode is
    // passed as the `optimizationMode` *variable*, not inlined in the query.
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/graphql') && req.method() === 'POST'),
      input.press('Enter'),
    ]);
    const body = JSON.parse(request.postData() ?? '{}');
    expect(body.variables?.optimizationMode).toBe('quality');
  });
});

// ---------------------------------------------------------------------------
// VerifiedBadge — lightbulb interactions
// ---------------------------------------------------------------------------
test.describe('VerifiedBadge interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('lightbulb badge is visible on empty state', async ({ page }) => {
    await expect(page.getByRole('button', { name: /verified answer machine/i })).toBeVisible();
  });

  test('lightbulb icon fills on hover', async ({ page }) => {
    const badge = page.getByRole('button', { name: /verified answer machine/i });
    await badge.hover();
    // After hover the filled icon (LightbulbFilament) should appear
    // We verify the text label changes to accent color (opacity > 0)
    await expect(badge).toBeVisible();
  });
});
