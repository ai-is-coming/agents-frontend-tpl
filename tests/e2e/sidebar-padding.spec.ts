import { test, expect } from '@playwright/test'

// This test ensures the left session list text is not obscured by the vertical scrollbar
// by verifying the ScrollArea viewport has right padding, and long titles render without
// being underneath the scrollbar overlay.

test('left session list has padding so titles are not covered by scrollbar', async ({ page }) => {
  // Set auth token before app scripts run
  await page.context().addInitScript(() => {
    window.localStorage.setItem('token', 'e2e@example.com')
  })

  // Mock sessions list with many items and long titles to force vertical scrollbar
  await page.route('**/session/list**', async (route) => {
    const sessions = Array.from({ length: 80 }, (_, i) => ({
      id: 10_000 - i,
      title: `This is a very very very long session title to test right padding near scrollbar index ${i} — 这是一个很长的标题用于测试滚动条遮挡问题`,
      status: 1,
      created_at: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
      updated_at: new Date(Date.now() - i * 30_000).toISOString(),
    }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sessions }),
    })
  })

  // Mock messages API to avoid backend dependency
  await page.route('**/session/*/msg/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages: [] }),
    })
  })

  // Open the app using configured baseURL (tests/e2e/playwright.config.ts)
  await page.goto('/')

  const sidebar = page.locator('aside').first()
  await expect(sidebar).toBeVisible()

  // Ensure the ScrollArea viewport exists and has right padding (set in ui/scroll-area.tsx)
  const viewport = sidebar.locator('[data-slot="scroll-area-viewport"]').first()
  await expect(viewport).toBeVisible()

  // At md viewport width, we expect pr-4 (>= 16px). Allow >= 12px to be robust.
  const pr = await viewport.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))
  expect(pr).toBeGreaterThanOrEqual(12)

  // Pick the first visible session title element and ensure it does not extend under the scrollbar
  const firstButton = viewport.locator('button').first()
  await expect(firstButton).toBeVisible()

  const titleDiv = firstButton.locator('.truncate.text-sm.font-medium').first()
  const bar = sidebar.locator('[data-slot="scroll-area-scrollbar"]').first()

  // Scroll a bit to ensure the vertical scrollbar is rendered/visible
  await viewport.evaluate((el) => { el.scrollTop = 50 })

  const [titleBox, barBox] = await Promise.all([
    titleDiv.boundingBox(),
    bar.boundingBox(),
  ])

  // If the bar is present, ensure there is some gap between title right edge and bar left edge
  if (titleBox && barBox) {
    expect(barBox.left - titleBox.right).toBeGreaterThanOrEqual(2)
  }
})

