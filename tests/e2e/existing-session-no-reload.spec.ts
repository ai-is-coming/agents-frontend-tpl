import { test, expect } from '@playwright/test';

test.describe('Existing Session No Reload', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.context().addInitScript(() => {
      window.localStorage.setItem('token', 'e2e@example.com')
    })
  })

  test('should not reload messages when sending message in existing session', async ({ page }) => {
    // Track how many times loadMessagesForSession is called
    let loadMessagesCallCount = 0;

    // Mock the API endpoints
    await page.route('**/session/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              id: 100,
              title: 'Existing Session',
              status: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.route('**/session/100/messages**', async (route) => {
      loadMessagesCallCount++;
      console.log(`=== loadMessagesForSession called (count: ${loadMessagesCallCount}) ===`);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: [
            {
              id: 1,
              session_id: 100,
              role: 'user',
              content: 'Previous message',
              created_at: new Date().toISOString()
            },
            {
              id: 2,
              session_id: 100,
              role: 'assistant',
              content: 'Previous response',
              created_at: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Mock the chat stream endpoint
    await page.route('**/api/agent/chat', async (route) => {
      console.log('=== Mock streaming response ===');
      
      const streamResponse = [
        'data: {"type":"text-delta","textDelta":"Hello"}\n\n',
        'data: {"type":"text-delta","textDelta":" from"}\n\n',
        'data: {"type":"text-delta","textDelta":" existing"}\n\n',
        'data: {"type":"text-delta","textDelta":" session!"}\n\n',
        'data: {"type":"finish","finishReason":"stop"}\n\n'
      ].join('');

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: streamResponse
      });
    });

    // Navigate to existing session
    console.log('=== Navigating to existing session ===');
    await page.goto('http://127.0.0.1:5001/c/100');
    await page.waitForLoadState('networkidle');
    
    const urlAfterLoad = page.url();
    console.log(`URL after load: ${urlAfterLoad}`);
    
    // Wait for messages to load
    await page.waitForTimeout(500);
    
    // Reset the counter after initial load
    const initialLoadCount = loadMessagesCallCount;
    console.log(`=== Initial load count: ${initialLoadCount} ===`);
    loadMessagesCallCount = 0;

    // Send a new message
    console.log('=== Sending message in existing session ===');
    const textarea = page.locator('textarea[placeholder*="Ask"]');
    await textarea.fill('New message in existing session');
    
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    // Wait for streaming to complete
    await page.waitForTimeout(2000);
    
    const urlAfterSending = page.url();
    console.log(`URL after sending message: ${urlAfterSending}`);
    
    // Check that URL didn't change
    expect(urlAfterSending).toBe('http://127.0.0.1:5001/c/100');
    
    // Check that loadMessagesForSession was NOT called again
    console.log(`=== Load count after sending: ${loadMessagesCallCount} ===`);
    expect(loadMessagesCallCount).toBe(0);
    
    // Verify the streaming response is visible
    const conversation = page.locator('[data-slot="conversation-content"]');
    const conversationText = await conversation.textContent();
    console.log(`Conversation text: ${conversationText}`);
    
    expect(conversationText).toContain('New message in existing session');
    expect(conversationText).toContain('Hello from existing session!');
    
    console.log('✅ No unnecessary reload when sending message in existing session!');
  });
});

