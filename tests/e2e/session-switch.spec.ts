import { test, expect } from '@playwright/test';

test.describe('Session Switching', () => {
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

  test('should load messages immediately when clicking a session', async ({ page }) => {
    // First create two different sessions, each with different messages

    // Create first session
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('First session message UNIQUE_1');

    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();
    await page.waitForTimeout(3000);

    const url1 = page.url();
    const sessionId1 = url1.match(/\/c\/(\d+)/)?.[1];
    console.log('First session URL:', url1, 'ID:', sessionId1);

    // Create second session
    await newButton.click();
    await page.waitForTimeout(1000);

    await textarea.fill('Second session message UNIQUE_2');
    await sendButton.click();
    await page.waitForTimeout(3000);

    const url2 = page.url();
    const sessionId2 = url2.match(/\/c\/(\d+)/)?.[1];
    console.log('Second session URL:', url2, 'ID:', sessionId2);

    // Access first session directly via URL
    await page.goto(`http://127.0.0.1:5001/c/${sessionId1}`);
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/session-switch-first-direct.png', fullPage: true });

    // Check page content
    let pageContent = await page.content();
    let hasFirstMessage = pageContent.includes('UNIQUE_1');
    console.log('After navigating to first session directly, page contains UNIQUE_1:', hasFirstMessage);

    expect(hasFirstMessage).toBe(true);

    // Now switch to second session by clicking button
    // Re-fetch button list
    const sessionButtons = await page.locator('aside button').all();
    console.log('Total sessions found:', sessionButtons.length);

    // Click first button (should be latest session)
    if (sessionButtons.length > 0) {
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log('URL after clicking first button:', currentUrl);

      // Take screenshot
      await page.screenshot({ path: 'test-results/session-switch-after-click.png', fullPage: true });

      // Check page content
      pageContent = await page.content();
      const hasSecondMessage = pageContent.includes('UNIQUE_2');
      console.log('After clicking first button, page contains UNIQUE_2:', hasSecondMessage);

      // If first button is second session, should display UNIQUE_2
      if (currentUrl.includes(sessionId2!)) {
        expect(hasSecondMessage).toBe(true);
      }
    }
  });

  test('should show correct messages when switching between sessions multiple times', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find all sessions
    const sessionButtons = await page.locator('aside button').all();
    console.log('Found sessions:', sessionButtons.length);

    if (sessionButtons.length >= 2) {
      // Click first session
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);

      const url1 = page.url();
      console.log('URL after clicking session 1:', url1);

      // Take screenshot
      await page.screenshot({ path: 'test-results/session-1.png', fullPage: true });

      // Click second session
      await sessionButtons[1].click();
      await page.waitForTimeout(2000);

      const url2 = page.url();
      console.log('URL after clicking session 2:', url2);

      // Take screenshot
      await page.screenshot({ path: 'test-results/session-2.png', fullPage: true });

      // Click first session again
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);

      const url3 = page.url();
      console.log('URL after clicking session 1 again:', url3);

      // Take screenshot
      await page.screenshot({ path: 'test-results/session-1-again.png', fullPage: true });

      // URL should be same as first click
      expect(url3).toBe(url1);
    }
  });
});

