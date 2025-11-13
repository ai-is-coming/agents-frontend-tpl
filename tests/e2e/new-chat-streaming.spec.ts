import { test, expect } from '@playwright/test'

test.describe('New Chat Streaming', () => {
  test.beforeEach(async ({ page }) => {
    // 监听控制台消息
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[Browser ${type}]:`, text);
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
      console.log('[Browser PAGE ERROR]:', error.message);
    });

    // Set auth token
    await page.context().addInitScript(() => {
      window.localStorage.setItem('token', 'e2e@example.com')
    })

    // Mock sessions list - start with some existing sessions
    await page.route('**/session/list**', async (route) => {
      const sessions = [
        {
          id: 100,
          title: 'Existing Session 1',
          status: 1,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 101,
          title: 'Existing Session 2',
          status: 1,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          updated_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions }),
      })
    })

  })

  test('should show streaming response when creating new chat', async ({ page }) => {
    let newSessionId = 200;
    let savedMessages: any[] = [];

    // Mock session creation
    await page.route('**/session/create**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessionId: newSessionId }),
      })
    })

    // Override message list mock for the new session
    await page.route('**/session/*/msg/list**', async (route) => {
      const url = new URL(route.request().url());
      // Extract session ID from URL path: /session/{id}/msg/list
      const match = url.pathname.match(/\/session\/(\d+)\/msg\/list/);
      const sessionId = match ? match[1] : null;

      if (sessionId === String(newSessionId)) {
        // Return saved messages for the new session
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: savedMessages }),
        })
      } else {
        // Return empty for other sessions
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [] }),
        })
      }
    })

    // Mock streaming chat response
    await page.route('**/api/agent/chat**', async (route) => {
      // Simulate streaming response - return all chunks at once
      // The client will still process them as a stream
      const responseBody = [
        'data: {"type":"text-delta","delta":"Hello"}\n\n',
        'data: {"type":"text-delta","delta":" there!"}\n\n',
        'data: {"type":"text-delta","delta":" This"}\n\n',
        'data: {"type":"text-delta","delta":" is"}\n\n',
        'data: {"type":"text-delta","delta":" a"}\n\n',
        'data: {"type":"text-delta","delta":" streaming"}\n\n',
        'data: {"type":"text-delta","delta":" response."}\n\n',
        'data: {"type":"finish"}\n\n',
      ].join('');

      // Save messages immediately (simulating that backend has saved them)
      savedMessages = [
        {
          id: 1,
          session_id: newSessionId,
          role: 'user',
          content: 'Test message for new chat',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          session_id: newSessionId,
          role: 'assistant',
          content: 'Hello there! This is a streaming response.',
          created_at: new Date().toISOString(),
        },
      ];

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
        },
        body: responseBody,
      })
    })

    // Navigate directly to new chat page
    console.log('\n=== Navigating to new chat page ===')
    await page.goto('http://127.0.0.1:5001/?new=true')
    await page.waitForTimeout(1000)

    const urlAfterLoad = page.url()
    console.log('URL after load:', urlAfterLoad)
    expect(urlAfterLoad).toContain('?new=true')

    console.log('\n=== Sending message in new chat ===')
    // Type and send a message
    const textarea = page.locator('textarea').first()
    await textarea.fill('Test message for new chat')
    await textarea.press('Enter')
    
    // Wait a bit for the session to be created and URL to update
    await page.waitForTimeout(500)
    
    const urlAfterSend = page.url()
    console.log('URL after sending message:', urlAfterSend)
    expect(urlAfterSend).toContain(`/c/${newSessionId}`)

    console.log('\n=== Checking for streaming response ===')
    // Wait for streaming to complete (8 chunks * 100ms = 800ms + buffer)
    // The streaming mock takes 800ms, then savedMessages is set, then router.push is called
    await page.waitForTimeout(1500)

    console.log('Waiting for URL to update...')
    // Wait for URL to update to /c/{sessionId}
    await page.waitForURL(`**/c/${newSessionId}`, { timeout: 3000 })

    const finalUrl = page.url()
    console.log('Final URL:', finalUrl)
    expect(finalUrl).toContain(`/c/${newSessionId}`)

    // Wait for messages to load after URL change
    console.log('Waiting for messages to load...')
    await page.waitForTimeout(1000)

    // Check that the messages are visible
    const conversationArea = page.getByRole('log')
    let conversationText = await conversationArea.textContent()
    console.log('Conversation text:', conversationText)
    console.log('Conversation contains user message:', conversationText?.includes('Test message for new chat'))
    console.log('Conversation contains assistant message:', conversationText?.includes('streaming response'))

    expect(conversationText).toContain('Test message for new chat')
    expect(conversationText).toContain('streaming response')

    // Wait for some streaming content to appear
    await page.waitForTimeout(500)
    
    // Check that streaming response is visible
    const updatedText = await conversationArea.textContent()
    console.log('Conversation text during streaming:', updatedText?.substring(0, 200))
    
    // Should contain at least part of the streaming response
    const hasStreamingContent = updatedText?.includes('Hello') || updatedText?.includes('there')
    console.log('Has streaming content:', hasStreamingContent)
    expect(hasStreamingContent).toBe(true)

    // Wait for streaming to complete
    await page.waitForTimeout(1000)
    
    // Check final content
    const finalText = await conversationArea.textContent()
    console.log('Final conversation text:', finalText?.substring(0, 200))
    expect(finalText).toContain('streaming response')

    console.log('\n✅ Streaming response visible during new chat creation!')
  })
})

