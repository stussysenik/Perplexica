import { test, expect } from '@playwright/test'

/**
 * Settings page e2e. The auth gate is stubbed as signed-in so the app shell
 * renders (settings is behind the gate). Refer to e2e/auth.spec.ts for the
 * gate tests themselves.
 */
test.describe('Settings page', () => {
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
    // Wipe settings between tests so defaults are in play
    await page.addInitScript(() => {
      window.localStorage.removeItem('perplexica.settings.v1')
    })
  })

  test('renders the three cards and back button', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /account/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /appearance/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /search defaults/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /go back/i })).toBeVisible()
  })

  test('changing theme persists to localStorage', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('radio', { name: /light/i }).click()

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('perplexica.settings.v1')
    )
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).theme).toBe('light')
  })

  test('changing default mode persists to localStorage and applies on home', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('radio', { name: /quality/i }).click()

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('perplexica.settings.v1')
    )
    expect(JSON.parse(stored!).defaultMode).toBe('quality')

    await page.goto('/')
    await expect(page.getByRole('button', { name: /quality/i })).toHaveClass(/border-b-2/)
  })

  test('sidebar Settings link navigates to /settings on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await page.locator('aside').getByRole('link', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })
})
