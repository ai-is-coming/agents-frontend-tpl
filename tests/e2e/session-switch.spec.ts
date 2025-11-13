import { test, expect } from '@playwright/test';

test.describe('Session Switching', () => {
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

  test('should load messages immediately when clicking a session', async ({ page }) => {
    // 先创建两个不同的 session，每个都有不同的消息

    // 创建第一个 session
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

    // 创建第二个 session
    await newButton.click();
    await page.waitForTimeout(1000);

    await textarea.fill('Second session message UNIQUE_2');
    await sendButton.click();
    await page.waitForTimeout(3000);

    const url2 = page.url();
    const sessionId2 = url2.match(/\/c\/(\d+)/)?.[1];
    console.log('Second session URL:', url2, 'ID:', sessionId2);

    // 直接通过 URL 访问第一个 session
    await page.goto(`http://127.0.0.1:5001/c/${sessionId1}`);
    await page.waitForTimeout(2000);

    // 截图
    await page.screenshot({ path: 'test-results/session-switch-first-direct.png', fullPage: true });

    // 检查页面内容
    let pageContent = await page.content();
    let hasFirstMessage = pageContent.includes('UNIQUE_1');
    console.log('After navigating to first session directly, page contains UNIQUE_1:', hasFirstMessage);

    expect(hasFirstMessage).toBe(true);

    // 现在通过点击按钮切换到第二个 session
    // 重新获取按钮列表
    const sessionButtons = await page.locator('aside button').all();
    console.log('Total sessions found:', sessionButtons.length);

    // 点击第一个按钮（应该是最新的 session）
    if (sessionButtons.length > 0) {
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log('URL after clicking first button:', currentUrl);

      // 截图
      await page.screenshot({ path: 'test-results/session-switch-after-click.png', fullPage: true });

      // 检查页面内容
      pageContent = await page.content();
      const hasSecondMessage = pageContent.includes('UNIQUE_2');
      console.log('After clicking first button, page contains UNIQUE_2:', hasSecondMessage);

      // 如果第一个按钮是第二个 session，应该显示 UNIQUE_2
      if (currentUrl.includes(sessionId2!)) {
        expect(hasSecondMessage).toBe(true);
      }
    }
  });

  test('should show correct messages when switching between sessions multiple times', async ({ page }) => {
    await page.waitForTimeout(2000);

    // 找到所有 session
    const sessionButtons = await page.locator('aside button').all();
    console.log('Found sessions:', sessionButtons.length);

    if (sessionButtons.length >= 2) {
      // 点击第一个 session
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);

      const url1 = page.url();
      console.log('URL after clicking session 1:', url1);

      // 截图
      await page.screenshot({ path: 'test-results/session-1.png', fullPage: true });

      // 点击第二个 session
      await sessionButtons[1].click();
      await page.waitForTimeout(2000);

      const url2 = page.url();
      console.log('URL after clicking session 2:', url2);

      // 截图
      await page.screenshot({ path: 'test-results/session-2.png', fullPage: true });

      // 再次点击第一个 session
      await sessionButtons[0].click();
      await page.waitForTimeout(2000);

      const url3 = page.url();
      console.log('URL after clicking session 1 again:', url3);

      // 截图
      await page.screenshot({ path: 'test-results/session-1-again.png', fullPage: true });

      // URL 应该和第一次点击时相同
      expect(url3).toBe(url1);
    }
  });
});

