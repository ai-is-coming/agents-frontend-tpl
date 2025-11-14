import { test, expect } from '@playwright/test';

test.describe('URL Routing', () => {
  const testEmail = 'test@example.com';

  test.beforeEach(async ({ page }) => {
    // Set token (email) to bypass login
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate((email) => {
      localStorage.setItem('token', email);
    }, testEmail);
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('should redirect to /c/{sessionId} when loading home page with existing sessions', async ({ page }) => {
    // Wait for page to load and auto redirect
    await page.waitForTimeout(2000);

    // Check if URL contains /c/
    const url = page.url();
    console.log('Current URL:', url);

    // URL should be in /c/{sessionId} format
    expect(url).toMatch(/\/c\/\d+/);
  });

  test('should update URL to /c/{sessionId} when clicking a session', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find second session (if exists)
    const sessionButtons = await page.locator('aside button').filter({ hasText: /Chat|Session/ }).all();

    if (sessionButtons.length > 1) {
      // Click second session
      await sessionButtons[1].click();
      await page.waitForTimeout(1000);

      // Check if URL is updated
      const url = page.url();
      console.log('URL after clicking session:', url);
      expect(url).toMatch(/\/c\/\d+/);
    }
  });

  test('should update URL to / when clicking New Chat button', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Click New Chat button (black circular button)
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    // Check if URL returns to home (may have ?new=true param)
    const url = page.url();
    console.log('URL after clicking New Chat:', url);
    expect(url).toMatch(/http:\/\/127\.0\.0\.1:5001\/(\?new=true)?$/);
  });

  test('should create new session and update URL when sending first message', async ({ page }) => {
    // Click New Chat button
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    // Input message
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test message for URL routing');

    // Send message
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();

    // Wait for session creation and URL update
    await page.waitForTimeout(3000);

    // Check if URL is updated to /c/{sessionId}
    const url = page.url();
    console.log('URL after sending message:', url);
    expect(url).toMatch(/\/c\/\d+/);
  });

  test('should load correct session when accessing /c/{sessionId} directly', async ({ page }) => {
    // First get a session ID
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const match = currentUrl.match(/\/c\/(\d+)/);

    if (match) {
      const sessionId = match[1];

      // Access this URL directly
      await page.goto(`http://127.0.0.1:5001/c/${sessionId}`);
      await page.waitForTimeout(2000);

      // Check if URL is correct
      expect(page.url()).toContain(`/c/${sessionId}`);

      // Check if page loads correctly (should have messages or input box)
      const textarea = page.locator('textarea').first();
      await expect(textarea).toBeVisible();
    }
  });

  test('should take screenshot of URL routing', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/url-routing.png', fullPage: true });
  });
});

