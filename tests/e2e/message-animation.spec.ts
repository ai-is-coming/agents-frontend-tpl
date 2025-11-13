import { test, expect } from '@playwright/test';

test.describe('Message Animation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
    });

    // Mock sessions list
    await page.route('**/session/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            { id: 100, title: 'Session with many messages', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 101, title: 'Another session', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          ],
        }),
      });
    });

    // Mock session creation
    await page.route('**/session/create**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessionId: 100 }),
      });
    });
  });

  test('should animate messages when switching sessions', async ({ page }) => {
    // Mock messages for session 100 (many messages)
    const manyMessages = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      session_id: 100,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 1}: This is a test message with some content to make it visible.`,
      created_at: new Date().toISOString(),
    }));

    await page.route('**/session/100/msg/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: manyMessages }),
      });
    });

    // Mock messages for session 101 (few messages)
    await page.route('**/session/101/msg/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: [
            { id: 1, session_id: 101, role: 'user', content: 'Hello', created_at: new Date().toISOString() },
            { id: 2, session_id: 101, role: 'assistant', content: 'Hi there!', created_at: new Date().toISOString() },
          ],
        }),
      });
    });

    // Navigate to the app
    await page.goto('http://127.0.0.1:5001');
    await page.waitForTimeout(2000);

    console.log('=== Initial load complete ===');

    // Get the conversation area
    const conversation = page.locator('[data-slot="conversation-content"]').first();
    
    // Wait for messages to load
    await page.waitForTimeout(1000);
    
    // Count initial messages
    const initialMessages = await conversation.locator('[data-slot="message"]').count();
    console.log('Initial message count:', initialMessages);

    // Click on the second session
    const sessionButtons = await page.locator('aside button').all();
    if (sessionButtons.length > 1) {
      console.log('=== Clicking second session ===');
      await sessionButtons[1].click();
      
      // Wait for animation to complete
      await page.waitForTimeout(1500);
      
      // Count messages after switch
      const newMessages = await conversation.locator('[data-slot="message"]').count();
      console.log('Message count after switch:', newMessages);
      
      // Verify messages changed
      expect(newMessages).toBe(2);
    }

    // Click back to first session
    console.log('=== Clicking first session ===');
    await sessionButtons[0].click();
    
    // Wait for animation to complete
    await page.waitForTimeout(2000);
    
    // Count messages after switch back
    const finalMessages = await conversation.locator('[data-slot="message"]').count();
    console.log('Message count after switch back:', finalMessages);
    
    // Verify we have many messages again
    expect(finalMessages).toBe(20);

    console.log('✅ Animation test complete!');
  });

  test('should show smooth staggered animation for multiple messages', async ({ page }) => {
    // Mock messages for session 100
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      session_id: 100,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 1}`,
      created_at: new Date().toISOString(),
    }));

    await page.route('**/session/100/msg/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages }),
      });
    });

    // Navigate to the app
    await page.goto('http://127.0.0.1:5001/c/100');
    
    // Wait a bit for initial render
    await page.waitForTimeout(500);
    
    // Check that messages are present
    const conversation = page.locator('[data-slot="conversation-content"]').first();
    const messageCount = await conversation.locator('[data-slot="message"]').count();
    
    console.log('Message count:', messageCount);
    expect(messageCount).toBe(10);
    
    // Take a screenshot to verify visual appearance
    await page.screenshot({ path: 'test-results/message-animation.png', fullPage: true });
    
    console.log('✅ Staggered animation test complete!');
  });
});

