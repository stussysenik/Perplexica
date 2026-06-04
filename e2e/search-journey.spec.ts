import { test, expect } from '@playwright/test'

/**
 * Live end-to-end search journey — the real thing.
 *
 * This drives an actual query through Phoenix → NIM (qwen/qwen3.5-397b-a17b)
 * and waits for a real, cited answer to render. It hits live APIs and takes
 * tens of seconds, so it is OPT-IN: it only runs when LIVE_SEARCH=1, keeping
 * the default suite fast and deterministic.
 *
 *   LIVE_SEARCH=1 npx playwright test e2e/search-journey.spec.ts \
 *     --project=chromium --headed
 */
const LIVE = process.env.LIVE_SEARCH === '1'

test.describe('Live search journey', () => {
  test.skip(!LIVE, 'Set LIVE_SEARCH=1 to run the live, API-hitting search journey')

  test('typing a question returns a cited answer', async ({ page }) => {
    // Generous: a single research round can hit the upstream 120s HTTP timeout
    // and recover, so allow headroom to still observe completion.
    test.setTimeout(300_000)

    await page.goto('/')

    const input = page.getByPlaceholder('Ask anything...')
    await expect(input).toBeVisible()

    // Use Speed mode for a snappy, reliable single-round search.
    await page.getByRole('button', { name: /^speed$/i }).first().click()

    await input.fill('What is the Elixir actor model and how does it relate to the BEAM?')
    await page.screenshot({ path: 'test-results/journey-01-typed.png' })

    await input.press('Enter')

    // The user's query is echoed as an <h2> heading once the message renders.
    await expect(
      page.getByRole('heading', { name: /elixir actor model/i }),
    ).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: 'test-results/journey-02-submitted.png' })

    // Wait for the answer to complete: the Sources panel and the prose answer
    // body both appear when status flips to "completed".
    await expect(page.getByText('Sources', { exact: true })).toBeVisible({
      timeout: 160_000,
    })
    const answer = page.locator('.prose').first()
    await expect(answer).toBeVisible({ timeout: 160_000 })

    // The answer should have real, non-trivial content.
    const text = (await answer.innerText()).trim()
    expect(text.length).toBeGreaterThan(80)

    await page.screenshot({ path: 'test-results/journey-03-answered.png', fullPage: true })
    // Surface the answer in the test log so the run is self-documenting.
    console.log('\n----- ANSWER -----\n' + text + '\n------------------\n')
  })
})
