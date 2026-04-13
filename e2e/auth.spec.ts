import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Auth gate — signed-out + signed-in variants
//
// These tests do NOT hit real GitHub OAuth. Instead they stub /auth/whoami
// responses via page.route() so the gate's branches can be exercised in
// isolation. Full end-to-end OAuth validation is covered by the manual
// smoke notes in openspec/changes/add-github-auth-gate/smoke-notes.md.
// ---------------------------------------------------------------------------

test.describe('Auth gate — signed out', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/whoami', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ signed_in: false }),
      })
    })
  })

  test('renders the sign-in splash with a GitHub anchor', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in with github/i })).toBeVisible()
  })

  test('splash anchor points at /auth/github', async ({ page }) => {
    await page.goto('/')
    const anchor = page.getByRole('link', { name: /sign in with github/i })
    const href = await anchor.getAttribute('href')
    expect(href).toContain('/auth/github')
  })

  test('hides the main app when signed out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder('Ask anything...')).toHaveCount(0)
  })

  test('surfaces auth_error=forbidden query param', async ({ page }) => {
    await page.goto('/?auth_error=forbidden')
    await expect(page.getByText(/not authorized/i)).toBeVisible()
  })
})

test.describe('Auth gate — signed in', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/whoami', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          signed_in: true,
          username: 'senik',
          avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
        }),
      })
    })
  })

  test('renders the app when signed in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('find your own answer')
    await expect(page.getByPlaceholder('Ask anything...')).toBeVisible()
  })

  test('does not render the sign-in splash when signed in', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in with github/i })).toHaveCount(0)
  })
})
