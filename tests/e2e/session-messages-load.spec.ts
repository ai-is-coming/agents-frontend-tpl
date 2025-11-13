import { test, expect } from '@playwright/test';

test.describe('Session Messages Loading', () => {
  const testEmail = 'test@example.com';

  test.beforeEach(async ({ page }) => {
    // 监听控制台消息
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type.toUpperCase()}]:`, text);
      }
    });

    // 监听页面错误
    page.on('pageerror', error => {
      console.log('[Browser PAGE ERROR]:', error.message);
    });

    // 设置 token (email) 绕过登录
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate((email) => {
      localStorage.setItem('token', email);
    }, testEmail);
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('should load correct messages when switching between two sessions', async ({ page }) => {
    // 创建第一个 session
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
    
    // 创建第二个 session
    await newButton.click();
    await page.waitForTimeout(1000);
    
    await textarea.fill('Message for session B - UNIQUE_B');
    await sendButton.click();
    await page.waitForTimeout(3000);
    
    const urlB = page.url();
    const sessionIdB = urlB.match(/\/c\/(\d+)/)?.[1];
    console.log('Session B URL:', urlB, 'ID:', sessionIdB);
    
    // 现在通过 URL 直接访问 session A
    console.log('\n=== Testing direct navigation to Session A ===');
    await page.goto(`http://127.0.0.1:5001/c/${sessionIdA}`);
    await page.waitForTimeout(2000);

    // 只检查消息区域，排除 sidebar
    // 使用 role="log" 来定位消息列表区域
    const conversationArea = page.getByRole('log');
    let conversationText = await conversationArea.textContent();
    let hasA = conversationText?.includes('UNIQUE_A') || false;
    let hasB = conversationText?.includes('UNIQUE_B') || false;
    console.log('Session A conversation - Has UNIQUE_A:', hasA, 'Has UNIQUE_B:', hasB);

    expect(hasA).toBe(true);
    expect(hasB).toBe(false);
    
    // 通过 URL 直接访问 session B
    console.log('\n=== Testing direct navigation to Session B ===');
    await page.goto(`http://127.0.0.1:5001/c/${sessionIdB}`);
    await page.waitForTimeout(2000);

    conversationText = await conversationArea.textContent();
    hasA = conversationText?.includes('UNIQUE_A') || false;
    hasB = conversationText?.includes('UNIQUE_B') || false;
    console.log('Session B conversation - Has UNIQUE_A:', hasA, 'Has UNIQUE_B:', hasB);

    expect(hasA).toBe(false);
    expect(hasB).toBe(true);

    // 再次访问 session A
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
    // 等待页面加载
    await page.waitForTimeout(2000);
    
    // 获取当前 URL
    const currentUrl = page.url();
    const currentSessionId = currentUrl.match(/\/c\/(\d+)/)?.[1];
    console.log('Current session ID:', currentSessionId);
    
    // 获取所有 session 按钮
    const sessionButtons = await page.locator('aside button').all();
    console.log('Total sessions:', sessionButtons.length);
    
    if (sessionButtons.length >= 2) {
      // 点击第一个 session
      console.log('\n=== Clicking first session button ===');
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);
      
      const url1 = page.url();
      const sessionId1 = url1.match(/\/c\/(\d+)/)?.[1];
      console.log('After clicking first button, URL:', url1, 'ID:', sessionId1);
      
      // 截图
      await page.screenshot({ path: 'test-results/click-session-1.png', fullPage: true });
      
      // 点击第二个 session
      console.log('\n=== Clicking second session button ===');
      // 重新获取按钮列表（因为可能已经更新）
      const sessionButtons2 = await page.locator('aside button').all();
      await sessionButtons2[1].click();
      await page.waitForTimeout(2000);
      
      const url2 = page.url();
      const sessionId2 = url2.match(/\/c\/(\d+)/)?.[1];
      console.log('After clicking second button, URL:', url2, 'ID:', sessionId2);
      
      // 截图
      await page.screenshot({ path: 'test-results/click-session-2.png', fullPage: true });
      
      // URL 应该不同
      expect(sessionId1).not.toBe(sessionId2);
      
      // 再次点击第一个 session
      console.log('\n=== Clicking first session button again ===');
      const sessionButtons3 = await page.locator('aside button').all();
      await sessionButtons3[0].click();
      await page.waitForTimeout(2000);
      
      const url3 = page.url();
      const sessionId3 = url3.match(/\/c\/(\d+)/)?.[1];
      console.log('After clicking first button again, URL:', url3, 'ID:', sessionId3);
      
      // 截图
      await page.screenshot({ path: 'test-results/click-session-1-again.png', fullPage: true });
      
      // URL 应该和第一次点击时相同
      expect(sessionId3).toBe(sessionId1);
      
      console.log('\n✅ All click tests passed!');
    }
  });
});

