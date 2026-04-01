/**
 * Record high-fidelity browser interactions as .webm video files.
 * Usage: node tests/record-gifs.mjs
 * Then:  see ffmpeg commands below for GIF conversion
 */

import { chromium } from 'playwright'
import { renameSync, existsSync, mkdirSync } from 'fs'

const BASE = 'http://localhost:8910'
const REC_DIR = './tests/recordings'

if (!existsSync(REC_DIR)) mkdirSync(REC_DIR, { recursive: true })

async function recordDemo() {
  console.log('Recording: hero demo (desktop)...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: REC_DIR, size: { width: 1280, height: 720 } },
    colorScheme: 'light',
  })
  const page = await context.newPage()

  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // Hover a suggestion chip
  const chip = page.locator('button', { hasText: 'quantum computing' })
  if (await chip.count() > 0) {
    await chip.first().hover()
    await page.waitForTimeout(500)
  }

  // Click textarea and type
  const textarea = page.locator('textarea')
  await textarea.click()
  await page.waitForTimeout(300)
  await page.keyboard.type('How does quantum computing work?', { delay: 60 })
  await page.waitForTimeout(600)

  // Switch mode
  await page.getByText('Quality').click()
  await page.waitForTimeout(400)

  // Send
  await page.locator('button[aria-label="Send message"]').click()
  await page.waitForTimeout(6000)

  // Scroll to show content
  await page.evaluate(() => {
    const el = document.querySelector('.overflow-y-auto')
    if (el) el.scrollBy({ top: 300, behavior: 'smooth' })
  })
  await page.waitForTimeout(2000)

  const videoPath = await page.video()?.path()
  await context.close()
  await browser.close()

  if (videoPath) {
    renameSync(videoPath, `${REC_DIR}/demo.webm`)
    console.log('  Saved: recordings/demo.webm')
  }
}

async function recordDiscover() {
  console.log('Recording: discover page...')
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

  for (const topic of ['Finance', 'Art & Culture', 'Sports', 'Entertainment', 'Tech & Science']) {
    await page.getByText(topic, { exact: true }).click()
    await page.waitForTimeout(1200)
  }
  await page.waitForTimeout(1000)

  const videoPath = await page.video()?.path()
  await context.close()
  await browser.close()

  if (videoPath) {
    renameSync(videoPath, `${REC_DIR}/discover.webm`)
    console.log('  Saved: recordings/discover.webm')
  }
}

async function recordMobile() {
  console.log('Recording: mobile flow...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: REC_DIR, size: { width: 390, height: 844 } },
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // Type and send
  const textarea = page.locator('textarea')
  await textarea.click()
  await page.waitForTimeout(300)
  await page.keyboard.type('Best restaurants in Tokyo', { delay: 70 })
  await page.waitForTimeout(500)
  await page.locator('button[aria-label="Send message"]').click()
  await page.waitForTimeout(5000)

  // Navigate bottom tabs
  await page.locator('nav.fixed a[href="/library"]').click()
  await page.waitForTimeout(1500)
  await page.locator('nav.fixed a[href="/discover"]').click()
  await page.waitForTimeout(1500)
  await page.locator('nav.fixed a[href="/"]').click()
  await page.waitForTimeout(1500)

  const videoPath = await page.video()?.path()
  await context.close()
  await browser.close()

  if (videoPath) {
    renameSync(videoPath, `${REC_DIR}/mobile.webm`)
    console.log('  Saved: recordings/mobile.webm')
  }
}

// Run all recordings
await recordDemo()
await recordDiscover()
await recordMobile()
console.log('\nDone! Convert with:')
console.log('  ffmpeg -i tests/recordings/demo.webm -vf "fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 demo.gif')
