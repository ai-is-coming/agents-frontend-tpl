import { test, expect } from '@playwright/test';

test.describe('User Menu', () => {
  const testEmail = 'test@example.com';

  test.beforeEach(async ({ page }) => {
    // Set token (email) to bypass login
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate((email) => {
      localStorage.setItem('token', email);
    }, testEmail);
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test('should show user icon button in top right', async ({ page }) => {
    // Find user menu button (circular button)
    const userButton = page.locator('button.rounded-full').first();
    await expect(userButton).toBeVisible();
  });

  test('should open dropdown menu on click', async ({ page }) => {
    // Click user menu button
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // Check if dropdown menu is displayed
    const menuLabel = page.locator('text=My Account');
    await expect(menuLabel).toBeVisible();
  });

  test('should display user email in dropdown', async ({ page }) => {
    // Click user menu button
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // Check if user email is displayed
    const emailText = page.locator('text=' + testEmail);
    await expect(emailText).toBeVisible();
  });

  test('should show logout option in dropdown', async ({ page }) => {
    // Click user menu button
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // Check if Logout option exists
    const logoutItem = page.locator('text=Logout');
    await expect(logoutItem).toBeVisible();
  });

  test('should logout when clicking logout option', async ({ page }) => {
    // Click user menu button
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // Click Logout
    const logoutItem = page.locator('text=Logout').last();

    // Listen for navigation to login page
    const navigationPromise = page.waitForURL('**/login', { timeout: 5000 });
    await logoutItem.click();

    // Wait for navigation to complete
    await navigationPromise;

    // Verify redirected to login page
    expect(page.url()).toContain('/login');
  });

  test('should take screenshot of user menu', async ({ page }) => {
    // Click user menu button
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // Take screenshot
    await page.screenshot({ path: 'test-results/user-menu.png', fullPage: true });
  });
});

