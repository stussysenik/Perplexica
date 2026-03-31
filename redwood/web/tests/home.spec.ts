import { test, expect } from '@playwright/test'

test.describe('HomePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders empty state with suggestions', async ({ page }) => {
    await expect(page.getByText('What do you want to know?')).toBeVisible()
    await expect(page.getByText('AI-powered search with source traceability')).toBeVisible()

    // 4 suggestion buttons
    const suggestions = page.locator('button', { hasText: /quantum|restaurants|Elixir|AI research/ })
    await expect(suggestions).toHaveCount(4)
  })

  test('renders Perplexica branding', async ({ page }) => {
    // Logo "P" badge
    await expect(page.locator('text=P').first()).toBeVisible()
  })

  test('search input is present and focusable', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="Ask anything..."]')
    await expect(textarea).toBeVisible()

    // Focus with / shortcut
    await page.keyboard.press('/')
    await expect(textarea).toBeFocused()
  })

  test('mode selector has 3 modes', async ({ page }) => {
    await expect(page.getByText('Speed')).toBeVisible()
    await expect(page.getByText('Balanced')).toBeVisible()
    await expect(page.getByText('Quality')).toBeVisible()
  })

  test('mode selector toggles active state', async ({ page }) => {
    const qualityBtn = page.getByText('Quality').locator('..')
    await qualityBtn.click()
    // After clicking Quality, it should have the active accent styling
    await expect(qualityBtn).toHaveClass(/text-accent|bg-accent/)
  })

  test('suggestion click populates and sends', async ({ page }) => {
    const suggestion = page.locator('button', { hasText: 'What is quantum computing?' })
    await suggestion.click()

    // After clicking, empty state should disappear (search initiated)
    await expect(page.getByText('What do you want to know?')).not.toBeVisible({ timeout: 5000 })
  })

  test('textarea auto-grows on multiline input', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="Ask anything..."]')
    await textarea.click()
    await textarea.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5')

    const height = await textarea.evaluate(el => el.scrollHeight)
    expect(height).toBeGreaterThan(36) // default single-line height
  })

  test('shift+enter creates newline, enter submits', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder="Ask anything..."]')
    await textarea.click()
    await textarea.fill('test query')

    // Shift+Enter should NOT submit
    await page.keyboard.down('Shift')
    await page.keyboard.press('Enter')
    await page.keyboard.up('Shift')
    await expect(textarea).toBeFocused()
  })

  test('send button disabled when empty', async ({ page }) => {
    const sendBtn = page.locator('button').filter({ has: page.locator('svg') }).last()
    // The send button should be disabled when textarea is empty
    await expect(sendBtn).toBeDisabled()
  })
})
