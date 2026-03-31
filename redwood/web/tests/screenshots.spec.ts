import { test } from '@playwright/test'

/**
 * Screenshot baseline tests.
 * Captures full-page screenshots at 3 breakpoints for visual regression.
 * Run: npx playwright test screenshots.spec.ts --update-snapshots
 */

const breakpoints = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

const pages = [
  { name: 'home', path: '/' },
  { name: 'discover', path: '/discover' },
  { name: 'library', path: '/library' },
] as const

for (const bp of breakpoints) {
  for (const pg of pages) {
    test(`screenshot — ${pg.name} @ ${bp.name} (${bp.width}x${bp.height})`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
      })
      const page = await context.newPage()
      await page.goto(pg.path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // allow animations to settle

      await page.screenshot({
        path: `tests/screenshots/baseline/${pg.name}-${bp.name}.png`,
        fullPage: true,
      })

      await context.close()
    })
  }
}
