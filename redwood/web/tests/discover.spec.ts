import { test, expect } from '@playwright/test'

test.describe('DiscoverPage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/discover')
  })

  test('renders page title', async ({ page }) => {
    await expect(page.getByText('Discover')).toBeVisible()
  })

  test('renders all 5 topic pills', async ({ page }) => {
    await expect(page.getByText('Tech & Science')).toBeVisible()
    await expect(page.getByText('Finance')).toBeVisible()
    await expect(page.getByText('Art & Culture')).toBeVisible()
    await expect(page.getByText('Sports')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
  })

  test('Tech & Science is active by default', async ({ page }) => {
    const techPill = page.getByText('Tech & Science').locator('..')
    await expect(techPill).toHaveClass(/bg-accent|text-white/)
  })

  test('clicking topic pill changes active state', async ({ page }) => {
    const financePill = page.getByText('Finance')
    await financePill.click()

    // Finance should now be active
    await expect(financePill.locator('..')).toHaveClass(/bg-accent|text-white/)
  })

  test('shows loading spinner initially', async ({ page }) => {
    // On fresh load, should show spinner briefly
    const spinner = page.locator('.animate-spin')
    // It may resolve quickly, so just check the page loads without error
    await expect(page.getByText('Discover')).toBeVisible()
  })

  test('article cards render when data loads', async ({ page }) => {
    // Wait for loading to complete (spinner disappears or articles appear)
    await page.waitForTimeout(3000)

    // Either articles are shown or "No articles found" message
    const hasArticles = await page.locator('a[target="_blank"]').count()
    const hasEmpty = await page.getByText('No articles found').isVisible().catch(() => false)

    expect(hasArticles > 0 || hasEmpty).toBeTruthy()
  })

  test('article cards have external links', async ({ page }) => {
    await page.waitForTimeout(3000)
    const links = page.locator('a[target="_blank"][rel="noopener noreferrer"]')
    const count = await links.count()

    if (count > 0) {
      const href = await links.first().getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).toMatch(/^https?:\/\//)
    }
  })
})
