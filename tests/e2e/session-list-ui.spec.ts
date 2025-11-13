import { test, expect } from '@playwright/test'

/**
 * E2E test to verify session list UI issues:
 * 1. Check if session list text is covered by scrollbar
 * 2. Check if scrollbar is visible when there are many sessions
 * 3. Verify proper padding and text truncation
 */

test.describe('Session List UI', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token before app scripts run
    await page.context().addInitScript(() => {
      window.localStorage.setItem('token', 'e2e@example.com')
    })

    // Mock messages API to avoid backend dependency
    await page.route('**/session/*/msg/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      })
    })
  })

  test('session list should have visible scrollbar when content overflows', async ({ page }) => {
    // Mock sessions list with many items to force vertical scrollbar
    await page.route('**/session/list**', async (route) => {
      const sessions = Array.from({ length: 50 }, (_, i) => ({
        id: 10_000 - i,
        title: `Session ${i + 1}`,
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

    await page.goto('/')

    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    // Find the ScrollArea component
    const scrollArea = sidebar.locator('[data-slot="scroll-area"]').first()
    await expect(scrollArea).toBeVisible()

    // Find the viewport
    const viewport = sidebar.locator('[data-slot="scroll-area-viewport"]').first()
    await expect(viewport).toBeVisible()

    // Check if viewport has content that overflows
    const viewportHeight = await viewport.evaluate((el) => el.clientHeight)
    const scrollHeight = await viewport.evaluate((el) => el.scrollHeight)
    
    console.log(`Viewport height: ${viewportHeight}, Scroll height: ${scrollHeight}`)
    expect(scrollHeight).toBeGreaterThan(viewportHeight)

    // Find the scrollbar
    const scrollbar = sidebar.locator('[data-slot="scroll-area-scrollbar"]').first()
    
    // Scroll to trigger scrollbar visibility
    await viewport.evaluate((el) => { el.scrollTop = 100 })
    await page.waitForTimeout(500) // Wait for scrollbar to appear

    // Check if scrollbar is visible
    const scrollbarVisible = await scrollbar.isVisible()
    console.log(`Scrollbar visible: ${scrollbarVisible}`)
    
    // Get scrollbar dimensions
    const scrollbarBox = await scrollbar.boundingBox()
    if (scrollbarBox) {
      console.log(`Scrollbar dimensions: width=${scrollbarBox.width}, height=${scrollbarBox.height}`)
    }

    expect(scrollbarVisible).toBe(true)
  })

  test('session list text should not be covered by scrollbar', async ({ page }) => {
    // Mock sessions with very long titles
    await page.route('**/session/list**', async (route) => {
      const sessions = Array.from({ length: 80 }, (_, i) => ({
        id: 10_000 - i,
        title: `This is a very very very long session title to test scrollbar overlap issue ${i} — 这是一个很长的标题用于测试滚动条遮挡问题`,
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

    await page.goto('/')

    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    const viewport = sidebar.locator('[data-slot="scroll-area-viewport"]').first()
    await expect(viewport).toBeVisible()

    // Check viewport padding
    const paddingRight = await viewport.evaluate((el) => {
      const style = getComputedStyle(el)
      return parseFloat(style.paddingRight)
    })
    console.log(`Viewport padding-right: ${paddingRight}px`)

    // Get the first session button
    const firstButton = viewport.locator('button').first()
    await expect(firstButton).toBeVisible()

    // Get the title div
    const titleDiv = firstButton.locator('.truncate.text-sm.font-medium').first()
    await expect(titleDiv).toBeVisible()

    // Scroll to make scrollbar visible
    await viewport.evaluate((el) => { el.scrollTop = 100 })
    await page.waitForTimeout(500)

    // Get bounding boxes
    const titleBox = await titleDiv.boundingBox()
    const viewportBox = await viewport.boundingBox()
    const scrollbar = sidebar.locator('[data-slot="scroll-area-scrollbar"]').first()
    const scrollbarBox = await scrollbar.boundingBox()

    console.log('Title box:', titleBox)
    console.log('Viewport box:', viewportBox)
    console.log('Scrollbar box:', scrollbarBox)

    // Check if title text extends beyond the safe area (considering scrollbar)
    if (titleBox && viewportBox && scrollbarBox) {
      const titleRightEdge = titleBox.x + titleBox.width
      const scrollbarLeftEdge = scrollbarBox.x
      const gap = scrollbarLeftEdge - titleRightEdge
      
      console.log(`Gap between title and scrollbar: ${gap}px`)
      
      // There should be at least some gap (2px minimum)
      expect(gap).toBeGreaterThanOrEqual(2)
    }

    // Verify padding is sufficient (should be at least 12px for md breakpoint)
    expect(paddingRight).toBeGreaterThanOrEqual(12)
  })

  test('session list container should have proper layout', async ({ page }) => {
    // Mock a few sessions
    await page.route('**/session/list**', async (route) => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Test Session ${i + 1}`,
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

    await page.goto('/')

    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    // Check sidebar width
    const sidebarWidth = await sidebar.evaluate((el) => el.offsetWidth)
    console.log(`Sidebar width: ${sidebarWidth}px`)
    expect(sidebarWidth).toBe(280) // Should be 280px as per className

    // Check ScrollArea has flex-1 class (should take remaining space)
    const scrollArea = sidebar.locator('[data-slot="scroll-area"]').first()
    const scrollAreaClasses = await scrollArea.getAttribute('class')
    console.log(`ScrollArea classes: ${scrollAreaClasses}`)
    expect(scrollAreaClasses).toContain('flex-1')

    // Check the inner div has proper padding
    const innerDiv = scrollArea.locator('div.px-2.py-1.space-y-1').first()
    await expect(innerDiv).toBeVisible()

    const innerPadding = await innerDiv.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        paddingLeft: parseFloat(style.paddingLeft),
        paddingRight: parseFloat(style.paddingRight),
        paddingTop: parseFloat(style.paddingTop),
        paddingBottom: parseFloat(style.paddingBottom),
      }
    })
    console.log('Inner div padding:', innerPadding)

    // px-2 should be 8px (0.5rem)
    expect(innerPadding.paddingLeft).toBe(8)
    expect(innerPadding.paddingRight).toBe(8)
  })

  test('visual inspection - open browser to see session list', async ({ page }) => {
    // This test is for manual visual inspection
    // Mock sessions with various title lengths
    await page.route('**/session/list**', async (route) => {
      const sessions = [
        { id: 1, title: 'Short', status: 1 },
        { id: 2, title: 'Medium length title here', status: 1 },
        { id: 3, title: 'This is a very long title that should be truncated and might overlap with scrollbar', status: 1 },
        { id: 4, title: '这是一个中文标题测试滚动条遮挡问题这是一个中文标题测试滚动条遮挡问题', status: 1 },
        ...Array.from({ length: 46 }, (_, i) => ({
          id: i + 5,
          title: `Session ${i + 5} - ${i % 3 === 0 ? 'Long title to test truncation and scrollbar overlap' : 'Normal'}`,
          status: 1,
        }))
      ].map((s, i) => ({
        ...s,
        created_at: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
        updated_at: new Date(Date.now() - i * 30_000).toISOString(),
      }))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions }),
      })
    })

    await page.goto('/')

    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    // Scroll through the list
    const viewport = sidebar.locator('[data-slot="scroll-area-viewport"]').first()
    await viewport.evaluate((el) => { el.scrollTop = 0 })
    await page.waitForTimeout(1000)

    await viewport.evaluate((el) => { el.scrollTop = 200 })
    await page.waitForTimeout(1000)

    await viewport.evaluate((el) => { el.scrollTop = 500 })
    await page.waitForTimeout(1000)

    // Take a screenshot for visual verification
    await page.screenshot({ 
      path: 'test-results/session-list-visual.png',
      fullPage: true 
    })

    console.log('Screenshot saved to test-results/session-list-visual.png')
    
    // Keep browser open for manual inspection (only in headed mode)
    // await page.waitForTimeout(30000)
  })
})

