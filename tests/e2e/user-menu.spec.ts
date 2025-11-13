import { test, expect } from '@playwright/test';

test.describe('User Menu', () => {
  const testEmail = 'test@example.com';

  test.beforeEach(async ({ page }) => {
    // 设置 token (email) 绕过登录
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate((email) => {
      localStorage.setItem('token', email);
    }, testEmail);
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test('should show user icon button in top right', async ({ page }) => {
    // 查找用户菜单按钮（圆形按钮）
    const userButton = page.locator('button.rounded-full').first();
    await expect(userButton).toBeVisible();
  });

  test('should open dropdown menu on click', async ({ page }) => {
    // 点击用户菜单按钮
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // 检查下拉菜单是否显示
    const menuLabel = page.locator('text=My Account');
    await expect(menuLabel).toBeVisible();
  });

  test('should display user email in dropdown', async ({ page }) => {
    // 点击用户菜单按钮
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // 检查是否显示用户 email
    const emailText = page.locator('text=' + testEmail);
    await expect(emailText).toBeVisible();
  });

  test('should show logout option in dropdown', async ({ page }) => {
    // 点击用户菜单按钮
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // 检查是否有 Logout 选项
    const logoutItem = page.locator('text=Logout');
    await expect(logoutItem).toBeVisible();
  });

  test('should logout when clicking logout option', async ({ page }) => {
    // 点击用户菜单按钮
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // 点击 Logout
    const logoutItem = page.locator('text=Logout').last();

    // 监听导航到登录页
    const navigationPromise = page.waitForURL('**/login', { timeout: 5000 });
    await logoutItem.click();

    // 等待导航完成
    await navigationPromise;

    // 验证已经跳转到登录页
    expect(page.url()).toContain('/login');
  });

  test('should take screenshot of user menu', async ({ page }) => {
    // 点击用户菜单按钮
    const userButton = page.locator('button.rounded-full').first();
    await userButton.click();
    await page.waitForTimeout(300);

    // 截图
    await page.screenshot({ path: 'test-results/user-menu.png', fullPage: true });
  });
});

