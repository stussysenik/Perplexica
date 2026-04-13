import { test, expect } from '@playwright/test'

/**
 * Mode config e2e. Stubs the GraphQL endpoint so the settings card can be
 * exercised without a live Phoenix backend + DB.
 *
 * Real-backend verification is captured in the manual smoke notes.
 */
test.describe('Search Modes card', () => {
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

    await page.route('**/api/graphql', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}')
      const query: string = body.query || ''

      if (query.includes('ModeConfigsQuery')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              modeConfigs: [
                { mode: 'speed', maxIterations: 2, budgetMs: 7_000, __typename: 'ModeConfig' },
                { mode: 'balanced', maxIterations: 6, budgetMs: 16_000, __typename: 'ModeConfig' },
                { mode: 'quality', maxIterations: 25, budgetMs: 35_000, __typename: 'ModeConfig' },
              ],
            },
          }),
        })
        return
      }

      if (query.includes('UpdateModeConfigMutation')) {
        const variables = body.variables || {}
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              updateModeConfig: {
                mode: variables.mode,
                maxIterations: variables.maxIterations,
                budgetMs: variables.budgetMs,
                __typename: 'ModeConfig',
              },
            },
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      })
    })
  })

  test('renders three rows with default values', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /search modes/i })).toBeVisible()
    await expect(page.getByText('Speed', { exact: true })).toBeVisible()
    await expect(page.getByText('Balanced', { exact: true })).toBeVisible()
    await expect(page.getByText('Quality', { exact: true })).toBeVisible()
  })

  test('debounces save on iteration input change', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForSelector('text=Search Modes')

    // Target the Quality row's Iterations input
    const qualityCard = page
      .locator('text=Quality')
      .locator('xpath=ancestor::*[contains(@class, "rounded-spine")][1]')

    const iterationInput = qualityCard.locator('input[type="number"]').first()
    await iterationInput.fill('3')

    // Wait for the debounced save to fire (500 ms) and the success pip to appear
    await expect(qualityCard.getByText(/saved/i)).toBeVisible({ timeout: 3000 })
  })
})
