import { test, expect } from '@playwright/test';

test.describe('URL Routing', () => {
  const testEmail = 'test@example.com';

  test.beforeEach(async ({ page }) => {
    // 设置 token (email) 绕过登录
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate((email) => {
      localStorage.setItem('token', email);
    }, testEmail);
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('should redirect to /c/{sessionId} when loading home page with existing sessions', async ({ page }) => {
    // 等待页面加载并自动跳转
    await page.waitForTimeout(2000);
    
    // 检查 URL 是否包含 /c/
    const url = page.url();
    console.log('Current URL:', url);
    
    // URL 应该是 /c/{sessionId} 格式
    expect(url).toMatch(/\/c\/\d+/);
  });

  test('should update URL to /c/{sessionId} when clicking a session', async ({ page }) => {
    // 等待页面加载
    await page.waitForTimeout(2000);
    
    // 找到第二个 session（如果存在）
    const sessionButtons = await page.locator('aside button').filter({ hasText: /Chat|Session/ }).all();
    
    if (sessionButtons.length > 1) {
      // 点击第二个 session
      await sessionButtons[1].click();
      await page.waitForTimeout(1000);
      
      // 检查 URL 是否更新
      const url = page.url();
      console.log('URL after clicking session:', url);
      expect(url).toMatch(/\/c\/\d+/);
    }
  });

  test('should update URL to / when clicking New Chat button', async ({ page }) => {
    // 等待页面加载
    await page.waitForTimeout(2000);

    // 点击 New Chat 按钮（黑色圆形按钮）
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    // 检查 URL 是否回到首页（可能带有 ?new=true 参数）
    const url = page.url();
    console.log('URL after clicking New Chat:', url);
    expect(url).toMatch(/http:\/\/127\.0\.0\.1:5001\/(\?new=true)?$/);
  });

  test('should create new session and update URL when sending first message', async ({ page }) => {
    // 点击 New Chat 按钮
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(1000);
    
    // 输入消息
    const textarea = page.locator('textarea').first();
    await textarea.fill('Test message for URL routing');
    
    // 发送消息
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();
    
    // 等待 session 创建和 URL 更新
    await page.waitForTimeout(3000);
    
    // 检查 URL 是否更新为 /c/{sessionId}
    const url = page.url();
    console.log('URL after sending message:', url);
    expect(url).toMatch(/\/c\/\d+/);
  });

  test('should load correct session when accessing /c/{sessionId} directly', async ({ page }) => {
    // 先获取一个 session ID
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const match = currentUrl.match(/\/c\/(\d+)/);
    
    if (match) {
      const sessionId = match[1];
      
      // 直接访问这个 URL
      await page.goto(`http://127.0.0.1:5001/c/${sessionId}`);
      await page.waitForTimeout(2000);
      
      // 检查 URL 是否正确
      expect(page.url()).toContain(`/c/${sessionId}`);
      
      // 检查页面是否正常加载（应该有消息或输入框）
      const textarea = page.locator('textarea').first();
      await expect(textarea).toBeVisible();
    }
  });

  test('should take screenshot of URL routing', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/url-routing.png', fullPage: true });
  });
});

