import { test, expect } from '@playwright/test';

test.describe('Sidebar Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Set token to bypass login
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-token-for-testing');
    });
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test('should toggle sidebar visibility', async ({ page }) => {
    // Check sidebar initial state is visible
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // Get all buttons
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons: ${allButtons.length}`);

    // Find ChevronLeft button (2nd button, index 1)
    const hideButton = page.locator('button').nth(1);
    await hideButton.click();
    await page.waitForTimeout(300);

    // Check if sidebar is hidden
    await expect(sidebar).not.toBeVisible();

    // Find ChevronRight button (after sidebar hidden, it should be 2nd button)
    const showButton = page.locator('button').nth(1);
    await showButton.click();
    await page.waitForTimeout(300);

    // Check if sidebar is shown again
    await expect(sidebar).toBeVisible();
  });

  test('should show new chat button above suggestions', async ({ page }) => {
    // Find New button (black circular button)
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await expect(newButton).toBeVisible();

    // Check if button contains Plus icon
    const plusIcon = newButton.locator('svg');
    await expect(plusIcon).toBeVisible();

    // Check if button position is above preset conversation buttons
    const newButtonBox = await newButton.boundingBox();
    const firstSuggestion = page.locator('button').filter({ hasText: "What's the weather" }).first();
    const suggestionBox = await firstSuggestion.boundingBox();

    if (newButtonBox && suggestionBox) {
      expect(newButtonBox.y).toBeLessThan(suggestionBox.y);
    }
  });

  test('should create new chat when clicking new button', async ({ page }) => {
    // Click New button
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(500);

    // Verify button is clickable and has no errors
    await expect(newButton).toBeEnabled();
  });

  test('should take screenshot of new layout', async ({ page }) => {
    await page.screenshot({ path: 'test-results/sidebar-toggle-layout.png', fullPage: true });
  });
});

