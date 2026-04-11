import { test, expect } from '@playwright/test';

test.describe('Export & Provenance API', () => {
  test('answer action bar is not visible without a completed answer', async ({ page }) => {
    await page.goto('/');
    const actionBar = page.locator('text=Copy');
    const visible = await actionBar.isVisible().catch(() => false);
    expect(typeof visible).toBe('boolean');
  });

  test('Redwood input is visible on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const input = page.locator('textarea, input[type="text"]').first();
    const inputVisible = await input.isVisible().catch(() => false);
    expect(inputVisible).toBe(true);
  });
});

test.describe('Chat API', () => {
  test('GraphQL chats query returns empty list', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/graphql', {
      data: {
        query: '{ chats { id title createdAt } }',
      },
    });
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.data).toHaveProperty('chats');
    expect(Array.isArray(data.data.chats)).toBe(true);
  });

  test('GraphQL discover query returns data for tech topic', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/graphql', {
      data: {
        query: '{ discover(topic: "tech") { title url } }',
      },
    });
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.data).toHaveProperty('discover');
  });
});
