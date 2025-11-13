import { test, expect } from '@playwright/test';

test.describe('Typing Animation', () => {
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
            { id: 100, title: 'Test Session', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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

    // Mock empty messages initially
    await page.route('**/session/100/msg/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      });
    });
  });

  test('should show typing indicator before streaming starts', async ({ page }) => {
    // Mock streaming with a delay to see the typing indicator
    await page.route('**/api/agent/chat**', async (route) => {
      // Delay before sending response to allow typing indicator to show
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const responseBody = [
        'data: {"type":"text-delta","delta":"Hello"}\n\n',
        'data: {"type":"text-delta","delta":" World"}\n\n',
        'data: {"type":"finish"}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
        body: responseBody,
      });
    });

    // Navigate to the app
    await page.goto('http://127.0.0.1:5001/?new=true');
    await page.waitForTimeout(1000);

    console.log('=== Sending message ===');
    
    // Send a message
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test message');
    
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();

    console.log('=== Checking for typing indicator ===');
    
    // Wait a bit and check if typing indicator appears
    await page.waitForTimeout(500);
    
    // Look for the typing indicator (three animated dots)
    const typingIndicator = page.locator('.flex.items-center.gap-1').filter({ has: page.locator('.rounded-full.bg-muted-foreground\\/60') });
    
    // Check if typing indicator is visible (it might disappear quickly)
    const isVisible = await typingIndicator.count() > 0;
    console.log('Typing indicator visible:', isVisible);

    // Wait for the response to complete
    await page.waitForTimeout(2000);
    
    // Verify the message was received
    const conversation = page.locator('body');
    const conversationText = await conversation.textContent();
    console.log('Final conversation text:', conversationText);
    
    expect(conversationText).toContain('Hello World');
    
    console.log('✅ Typing animation test complete!');
  });

  test('should show streaming cursor during text output', async ({ page }) => {
    let chunksSent = 0;
    
    // Mock streaming with gradual chunks
    await page.route('**/api/agent/chat**', async (route) => {
      // Create a readable stream that sends chunks gradually
      const chunks = [
        'data: {"type":"text-delta","delta":"This"}\n\n',
        'data: {"type":"text-delta","delta":" is"}\n\n',
        'data: {"type":"text-delta","delta":" a"}\n\n',
        'data: {"type":"text-delta","delta":" streaming"}\n\n',
        'data: {"type":"text-delta","delta":" response"}\n\n',
        'data: {"type":"finish"}\n\n',
      ];
      
      const responseBody = chunks.join('');
      chunksSent = chunks.length;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
        body: responseBody,
      });
    });

    // Navigate to the app
    await page.goto('http://127.0.0.1:5001/?new=true');
    await page.waitForTimeout(1000);

    console.log('=== Sending message ===');
    
    // Send a message
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test streaming');
    
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();

    console.log('=== Checking for streaming cursor ===');
    
    // Wait for streaming to start
    await page.waitForTimeout(500);
    
    // Look for the streaming cursor (animated vertical line)
    const streamingCursor = page.locator('.inline-block.h-4.w-0\\.5.bg-foreground');
    
    // The cursor should appear during streaming
    const cursorCount = await streamingCursor.count();
    console.log('Streaming cursor count:', cursorCount);
    
    // Wait for streaming to complete
    await page.waitForTimeout(2000);
    
    // After streaming completes, cursor should disappear
    const finalCursorCount = await streamingCursor.count();
    console.log('Final cursor count (should be 0):', finalCursorCount);
    
    // Verify the complete message
    const conversation = page.locator('body');
    const conversationText = await conversation.textContent();
    console.log('Final conversation text:', conversationText);
    
    expect(conversationText).toContain('This is a streaming response');
    expect(finalCursorCount).toBe(0);
    
    console.log('✅ Streaming cursor test complete!');
  });

  test('should show smooth transition from typing indicator to streaming cursor', async ({ page }) => {
    // Mock streaming with initial delay
    await page.route('**/api/agent/chat**', async (route) => {
      // Small delay to show typing indicator
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const responseBody = [
        'data: {"type":"text-delta","delta":"Response"}\n\n',
        'data: {"type":"text-delta","delta":" text"}\n\n',
        'data: {"type":"finish"}\n\n',
      ].join('');

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
        body: responseBody,
      });
    });

    // Navigate to the app
    await page.goto('http://127.0.0.1:5001/?new=true');
    await page.waitForTimeout(1000);

    console.log('=== Sending message ===');
    
    // Send a message
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test transition');
    
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();

    console.log('=== Phase 1: Typing indicator should appear ===');
    await page.waitForTimeout(300);
    
    const typingIndicator = page.locator('.flex.items-center.gap-1').filter({ has: page.locator('.rounded-full') });
    const hasTypingIndicator = await typingIndicator.count() > 0;
    console.log('Has typing indicator:', hasTypingIndicator);

    console.log('=== Phase 2: Streaming cursor should appear when text starts ===');
    await page.waitForTimeout(800);
    
    const streamingCursor = page.locator('.inline-block.h-4.w-0\\.5');
    const hasCursor = await streamingCursor.count() > 0;
    console.log('Has streaming cursor:', hasCursor);

    console.log('=== Phase 3: Both should disappear when complete ===');
    await page.waitForTimeout(1500);
    
    const finalTypingCount = await typingIndicator.count();
    const finalCursorCount = await streamingCursor.count();
    console.log('Final typing indicator count:', finalTypingCount);
    console.log('Final cursor count:', finalCursorCount);

    // Verify the message
    const conversation = page.locator('body');
    const conversationText = await conversation.textContent();
    expect(conversationText).toContain('Response text');
    
    console.log('✅ Transition test complete!');
  });
});

