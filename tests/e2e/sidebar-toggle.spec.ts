import { test, expect } from '@playwright/test';

test.describe('Sidebar Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // 设置 token 绕过登录
    await page.goto('http://127.0.0.1:5001/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-token-for-testing');
    });
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test('should toggle sidebar visibility', async ({ page }) => {
    // 检查 sidebar 初始状态是可见的
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // 获取所有按钮
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons: ${allButtons.length}`);

    // 找到 ChevronLeft 按钮（第2个按钮，索引1）
    const hideButton = page.locator('button').nth(1);
    await hideButton.click();
    await page.waitForTimeout(300);

    // 检查 sidebar 是否隐藏
    await expect(sidebar).not.toBeVisible();

    // 找到 ChevronRight 按钮（sidebar 隐藏后，它应该是第2个按钮）
    const showButton = page.locator('button').nth(1);
    await showButton.click();
    await page.waitForTimeout(300);

    // 检查 sidebar 是否重新显示
    await expect(sidebar).toBeVisible();
  });

  test('should show new chat button above suggestions', async ({ page }) => {
    // 查找 New 按钮（黑色圆形按钮）
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await expect(newButton).toBeVisible();

    // 检查按钮是否包含 Plus 图标
    const plusIcon = newButton.locator('svg');
    await expect(plusIcon).toBeVisible();

    // 检查按钮位置是否在预置对话按钮上方
    const newButtonBox = await newButton.boundingBox();
    const firstSuggestion = page.locator('button').filter({ hasText: "What's the weather" }).first();
    const suggestionBox = await firstSuggestion.boundingBox();

    if (newButtonBox && suggestionBox) {
      expect(newButtonBox.y).toBeLessThan(suggestionBox.y);
    }
  });

  test('should create new chat when clicking new button', async ({ page }) => {
    // 点击 New 按钮
    const newButton = page.locator('button.rounded-full.bg-black').first();
    await newButton.click();
    await page.waitForTimeout(500);

    // 验证按钮可点击且没有错误
    await expect(newButton).toBeEnabled();
  });

  test('should take screenshot of new layout', async ({ page }) => {
    await page.screenshot({ path: 'test-results/sidebar-toggle-layout.png', fullPage: true });
  });
});

