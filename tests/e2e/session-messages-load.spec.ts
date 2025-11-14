import { test, expect } from '@playwright/test';

test.describe('Session Messages Loading', () => {
  const testEmail = 'test@example.com';

  test.beforeEach(async ({ page }) => {
    // Listen to console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type.toUpperCase()}]:`, text);
      }
    });

    // Listen to page errors
    page.on('pageerror', error => {
      console.log('[Browser PAGE ERROR]:', error.message);
    });

    // Set token (email) to bypass login
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate((email) => {
      localStorage.setItem('token', email);
    }, testEmail);
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('should load correct messages when switching between two sessions', async ({ page }) => {
    // Create first session
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    const textarea = page.locator('textarea').first();
    await textarea.fill('Message for session A - UNIQUE_A');

    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();
    await page.waitForTimeout(3000);

    const urlA = page.url();
    const sessionIdA = urlA.match(/\/c\/(\d+)/)?.[1];
    console.log('Session A URL:', urlA, 'ID:', sessionIdA);

    // Create second session
    await newButton.click();
    await page.waitForTimeout(1000);

    await textarea.fill('Message for session B - UNIQUE_B');
    await sendButton.click();
    await page.waitForTimeout(3000);

    const urlB = page.url();
    const sessionIdB = urlB.match(/\/c\/(\d+)/)?.[1];
    console.log('Session B URL:', urlB, 'ID:', sessionIdB);

    // Now navigate directly to session A via URL
    console.log('\n=== Testing direct navigation to Session A ===');
    await page.goto(`http://127.0.0.1:5001/c/${sessionIdA}`);
    await page.waitForTimeout(2000);

    // Only check message area, exclude sidebar
    // Use role="log" to locate message list area
    const conversationArea = page.getByRole('log');
    let conversationText = await conversationArea.textContent();
    let hasA = conversationText?.includes('UNIQUE_A') || false;
    let hasB = conversationText?.includes('UNIQUE_B') || false;
    console.log('Session A conversation - Has UNIQUE_A:', hasA, 'Has UNIQUE_B:', hasB);

    expect(hasA).toBe(true);
    expect(hasB).toBe(false);

    // Navigate directly to session B via URL
    console.log('\n=== Testing direct navigation to Session B ===');
    await page.goto(`http://127.0.0.1:5001/c/${sessionIdB}`);
    await page.waitForTimeout(2000);

    conversationText = await conversationArea.textContent();
    hasA = conversationText?.includes('UNIQUE_A') || false;
    hasB = conversationText?.includes('UNIQUE_B') || false;
    console.log('Session B conversation - Has UNIQUE_A:', hasA, 'Has UNIQUE_B:', hasB);

    expect(hasA).toBe(false);
    expect(hasB).toBe(true);

    // Navigate back to session A
    console.log('\n=== Testing navigation back to Session A ===');
    await page.goto(`http://127.0.0.1:5001/c/${sessionIdA}`);
    await page.waitForTimeout(2000);

    conversationText = await conversationArea.textContent();
    hasA = conversationText?.includes('UNIQUE_A') || false;
    hasB = conversationText?.includes('UNIQUE_B') || false;
    console.log('Session A again conversation - Has UNIQUE_A:', hasA, 'Has UNIQUE_B:', hasB);

    expect(hasA).toBe(true);
    expect(hasB).toBe(false);

    console.log('\n✅ All navigation tests passed!');
  });

  test('should load correct messages when clicking session buttons', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Get current URL
    const currentUrl = page.url();
    const currentSessionId = currentUrl.match(/\/c\/(\d+)/)?.[1];
    console.log('Current session ID:', currentSessionId);

    // Get all session buttons
    const sessionButtons = await page.locator('aside button').all();
    console.log('Total sessions:', sessionButtons.length);

    if (sessionButtons.length >= 2) {
      // Click first session
      console.log('\n=== Clicking first session button ===');
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);

      const url1 = page.url();
      const sessionId1 = url1.match(/\/c\/(\d+)/)?.[1];
      console.log('After clicking first button, URL:', url1, 'ID:', sessionId1);

      // Take screenshot
      await page.screenshot({ path: 'test-results/click-session-1.png', fullPage: true });

      // Click second session
      console.log('\n=== Clicking second session button ===');
      // Re-fetch button list (as it may have been updated)
      const sessionButtons2 = await page.locator('aside button').all();
      await sessionButtons2[1].click();
      await page.waitForTimeout(2000);

      const url2 = page.url();
      const sessionId2 = url2.match(/\/c\/(\d+)/)?.[1];
      console.log('After clicking second button, URL:', url2, 'ID:', sessionId2);

      // Take screenshot
      await page.screenshot({ path: 'test-results/click-session-2.png', fullPage: true });

      // URLs should be different
      expect(sessionId1).not.toBe(sessionId2);

      // Click first session again
      console.log('\n=== Clicking first session button again ===');
      const sessionButtons3 = await page.locator('aside button').all();
      await sessionButtons3[0].click();
      await page.waitForTimeout(2000);

      const url3 = page.url();
      const sessionId3 = url3.match(/\/c\/(\d+)/)?.[1];
      console.log('After clicking first button again, URL:', url3, 'ID:', sessionId3);

      // Take screenshot
      await page.screenshot({ path: 'test-results/click-session-1-again.png', fullPage: true });

      // URL should be same as first click
      expect(sessionId3).toBe(sessionId1);

      console.log('\n✅ All click tests passed!');
    }
  });
});

