import { test, expect } from '@playwright/test'

test.describe('AppLayout — Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('sidebar is visible on desktop', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('sidebar has navigation items', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside').getByText('Search')).toBeVisible()
    await expect(page.locator('aside').getByText('Discover')).toBeVisible()
    await expect(page.locator('aside').getByText('Library')).toBeVisible()
  })

  test('sidebar has theme toggle', async ({ page }) => {
    await page.goto('/')
    const themeBtn = page.locator('aside button', { hasText: /Light Mode|Dark Mode/ })
    await expect(themeBtn).toBeVisible()
  })

  test('active nav state on home', async ({ page }) => {
    await page.goto('/')
    const searchNav = page.locator('aside a[href="/"]')
    await expect(searchNav).toHaveClass(/text-accent|bg-accent/)
  })

  test('active nav state on discover', async ({ page }) => {
    await page.goto('/discover')
    const discoverNav = page.locator('aside a[href="/discover"]')
    await expect(discoverNav).toHaveClass(/text-accent|bg-accent/)
  })

  test('bottom nav is hidden on desktop', async ({ page }) => {
    await page.goto('/')
    const bottomNav = page.locator('nav.fixed')
    await expect(bottomNav).not.toBeVisible()
  })

  test('Perplexica branding in sidebar', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside').getByText('Perplexica')).toBeVisible()
  })
})

test.describe('AppLayout — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('sidebar is hidden on mobile', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toBeVisible()
  })

  test('mobile header is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.lg\\:hidden').first()).toBeVisible()
    await expect(page.getByText('Perplexica').first()).toBeVisible()
  })

  test('bottom nav is visible on mobile', async ({ page }) => {
    await page.goto('/')
    // Bottom nav contains Search, Discover, Library
    const bottomNav = page.locator('nav.fixed')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.getByText('Search')).toBeVisible()
    await expect(bottomNav.getByText('Discover')).toBeVisible()
    await expect(bottomNav.getByText('Library')).toBeVisible()
  })

  test('bottom nav active state', async ({ page }) => {
    await page.goto('/')
    const searchTab = page.locator('nav.fixed a[href="/"]')
    await expect(searchTab).toHaveClass(/text-accent/)
  })

  test('bottom nav navigation works', async ({ page }) => {
    await page.goto('/')
    const discoverTab = page.locator('nav.fixed a[href="/discover"]')
    await discoverTab.click()
    await expect(page).toHaveURL('/discover')
    await expect(page.getByText('Discover')).toBeVisible()
  })
})

test.describe('Theme Toggle', () => {
  test('toggles between light and dark mode', async ({ page }) => {
    await page.goto('/')

    // Get initial theme state
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')

    // Click theme toggle in sidebar (desktop)
    const themeBtn = page.locator('aside button', { hasText: /Light Mode|Dark Mode/ })
    if (await themeBtn.isVisible()) {
      await themeBtn.click()
      const newClass = await html.getAttribute('class')
      // Theme class should have changed
      expect(newClass).not.toEqual(initialClass)
    }
  })
})
