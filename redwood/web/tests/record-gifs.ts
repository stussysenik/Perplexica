/**
 * Playwright script to record high-fidelity GIFs for the README.
 *
 * Records browser interactions as .webm video files, then we convert
 * to optimized GIFs via ffmpeg.
 *
 * Usage: npx playwright test tests/record-gifs.ts --project=chromium
 * Then:  ffmpeg -i recordings/demo.webm -vf "fps=12,scale=800:-1..." demo.gif
 */

import { test, chromium } from '@playwright/test'

const BASE = 'http://localhost:8910'
const REC_DIR = './tests/recordings'

test.describe.configure({ mode: 'serial' })

test('record: hero demo (desktop search flow)', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: REC_DIR, size: { width: 1280, height: 720 } },
    colorScheme: 'light',
  })
  const page = await context.newPage()

  // Land on home
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // Hover over suggestion chips to show hover states
  const chips = page.locator('button', { hasText: 'quantum computing' })
  if (await chips.count() > 0) {
    await chips.first().hover()
    await page.waitForTimeout(400)
  }

  // Click the textarea and type with realistic delay
  const textarea = page.locator('textarea[placeholder="Ask anything..."]')
  await textarea.click()
  await page.waitForTimeout(300)
  await page.keyboard.type('How does quantum computing work?', { delay: 60 })
  await page.waitForTimeout(600)

  // Switch to Quality mode
  const qualityBtn = page.getByText('Quality')
  await qualityBtn.click()
  await page.waitForTimeout(400)

  // Send the query
  await page.locator('button[aria-label="Send message"]').click()
  await page.waitForTimeout(6000) // Wait for search progress + results

  // Scroll down slowly to show answer
  await page.evaluate(() => {
    const el = document.querySelector('.overflow-y-auto')
    if (el) el.scrollBy({ top: 300, behavior: 'smooth' })
  })
  await page.waitForTimeout(2000)

  // Close to save video
  const videoPath = await page.video()?.path()
  await context.close()
  await browser.close()

  // Rename to predictable name
  if (videoPath) {
    const fs = await import('fs')
    fs.renameSync(videoPath, `${REC_DIR}/demo.webm`)
  }
})

test('record: discover page (topic switching)', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: REC_DIR, size: { width: 1280, height: 720 } },
    colorScheme: 'light',
  })
  const page = await context.newPage()

  await page.goto(`${BASE}/discover`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // Click through topics
  const topics = ['Finance', 'Art & Culture', 'Sports', 'Entertainment', 'Tech & Science']
  for (const topic of topics) {
    await page.getByText(topic, { exact: true }).click()
    await page.waitForTimeout(1200)
  }

  await page.waitForTimeout(1000)

  const videoPath = await page.video()?.path()
  await context.close()
  await browser.close()

  if (videoPath) {
    const fs = await import('fs')
    fs.renameSync(videoPath, `${REC_DIR}/discover.webm`)
  }
})

test('record: mobile search flow', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: REC_DIR, size: { width: 390, height: 844 } },
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  // Home
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // Type query
  const textarea = page.locator('textarea[placeholder="Ask anything..."]')
  await textarea.click()
  await page.waitForTimeout(300)
  await page.keyboard.type('Best restaurants in Tokyo', { delay: 70 })
  await page.waitForTimeout(500)

  // Send
  await page.locator('button[aria-label="Send message"]').click()
  await page.waitForTimeout(5000)

  // Navigate to Library via bottom nav
  await page.locator('nav.fixed a[href="/library"]').click()
  await page.waitForTimeout(1500)

  // Navigate to Discover
  await page.locator('nav.fixed a[href="/discover"]').click()
  await page.waitForTimeout(1500)

  // Back to Home
  await page.locator('nav.fixed a[href="/"]').click()
  await page.waitForTimeout(1500)

  const videoPath = await page.video()?.path()
  await context.close()
  await browser.close()

  if (videoPath) {
    const fs = await import('fs')
    fs.renameSync(videoPath, `${REC_DIR}/mobile.webm`)
  }
})
