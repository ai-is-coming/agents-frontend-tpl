import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Debug text overflow issue', () => {
  test('inspect session list layout and overflow', async ({ page }) => {
    const logs: string[] = [];
    const log = (msg: string) => {
      console.log(msg);
      logs.push(msg);
    };

    // 访问页面并设置 token
    await page.goto('http://127.0.0.1:5001/');

    // 设置 localStorage token 以绕过登录
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-token-for-testing');
    });

    log('Token set, reloading page');

    // 重新加载页面
    await page.goto('http://127.0.0.1:5001/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 先截图看看页面状态
    await page.screenshot({ path: 'test-results/debug-page-loaded.png', fullPage: true });
    log('Screenshot saved after waiting');

    // 检查是否有 aside 元素
    const asideCount = await page.locator('aside').count();
    log(`Aside count: ${asideCount}`);

    if (asideCount === 0) {
      log('❌ No aside element found! Waiting another 5 seconds...');
      await page.waitForTimeout(5000);
      const asideCount2 = await page.locator('aside').count();
      log(`Aside count after extra wait: ${asideCount2}`);

      if (asideCount2 === 0) {
        const bodyHTML = await page.locator('body').innerHTML();
        fs.writeFileSync('test-results/debug-overflow.log', logs.join('\n'));
        fs.writeFileSync('test-results/page-html.html', bodyHTML);
        log('Still no aside found, exiting');
        return;
      }
    }

    // 找到 aside 元素
    const aside = page.locator('aside').first();
    await expect(aside).toBeVisible({ timeout: 10000 });

    // 获取 aside 的宽度
    const asideBox = await aside.boundingBox();
    log(`Aside width: ${asideBox?.width}`);
    log(`Aside position: ${JSON.stringify(asideBox)}`);

    // 直接在 ScrollArea 内部注入测试按钮来模拟长文本
    await page.evaluate(() => {
      const scrollAreaContent = document.querySelector('aside [data-slot="scroll-area"] > div > div');
      if (scrollAreaContent) {
        // 确保容器有正确的类
        scrollAreaContent.className = 'px-3 py-1 space-y-1';

        // 清空现有内容
        scrollAreaContent.innerHTML = '';

        // 创建测试按钮
        const testTitles = [
          'This is a very long session title that should definitely overflow the sidebar width and cause text truncation issues',
          'Another extremely long title with lots of text to test the overflow behavior',
          'Short title',
          '这是一个非常非常长的中文标题用来测试文字溢出的情况看看会不会被遮挡住',
        ];

        testTitles.forEach((title, i) => {
          const button = document.createElement('button');
          button.className = 'rounded-md px-2 py-2 text-left hover:bg-accent flex flex-col min-w-0 overflow-hidden';
          button.style.width = '100%';
          button.style.maxWidth = '254px';
          button.innerHTML = `
            <div class="truncate text-sm font-medium">${title}</div>
            <div class="truncate text-xs text-muted-foreground">2 minutes ago</div>
          `;
          scrollAreaContent.appendChild(button);
        });
      }
    });

    await page.waitForTimeout(500);
    log('Test buttons injected');

    // 找到所有 session 按钮（排除 New 按钮）
    // Session 按钮在 ScrollArea 内部
    const buttons = page.locator('aside [data-slot="scroll-area"] button');
    const buttonCount = await buttons.count();
    log(`Total session buttons: ${buttonCount}`);

    if (buttonCount > 0) {
      // 检查第一个按钮
      const firstButton = buttons.first();
      const buttonBox = await firstButton.boundingBox();
      log(`First button box: ${JSON.stringify(buttonBox)}`);

      // 获取按钮的 HTML 内容
      const buttonHTML = await firstButton.innerHTML();
      log(`Button HTML: ${buttonHTML.substring(0, 200)}`);

      // 获取按钮内的文字元素
      const titleDivs = firstButton.locator('div');
      const titleDivCount = await titleDivs.count();
      log(`Title div count: ${titleDivCount}`);

      if (titleDivCount > 0) {
        const titleDiv = titleDivs.first();
        const titleBox = await titleDiv.boundingBox();
        log(`Title div box: ${JSON.stringify(titleBox)}`);

        // 检查文字是否溢出 aside
        if (asideBox && titleBox) {
          const asideRight = asideBox.x + asideBox.width;
          const titleRight = titleBox.x + titleBox.width;
          log(`Aside right edge: ${asideRight}`);
          log(`Title right edge: ${titleRight}`);
          log(`Overflow amount: ${titleRight - asideRight}`);

          if (titleRight > asideRight) {
            log('❌ TEXT IS OVERFLOWING!');
            log(`Overflow by: ${titleRight - asideRight} pixels`);
          } else {
            log('✅ Text is within bounds');
          }
        }

        // 获取计算后的样式
        const buttonStyles = await firstButton.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            width: computed.width,
            paddingLeft: computed.paddingLeft,
            paddingRight: computed.paddingRight,
            overflow: computed.overflow,
            display: computed.display,
          };
        });
        log(`Button computed styles: ${JSON.stringify(buttonStyles)}`);

        const titleStyles = await titleDiv.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            width: computed.width,
            overflow: computed.overflow,
            textOverflow: computed.textOverflow,
            whiteSpace: computed.whiteSpace,
            display: computed.display,
          };
        });
        log(`Title div computed styles: ${JSON.stringify(titleStyles)}`);

        // 检查 ScrollArea 的宽度
        const scrollArea = page.locator('aside [data-slot="scroll-area"]').first();
        const scrollAreaBox = await scrollArea.boundingBox();
        log(`ScrollArea box: ${JSON.stringify(scrollAreaBox)}`);

        const viewport = page.locator('aside [data-slot="scroll-area-viewport"]').first();
        const viewportBox = await viewport.boundingBox();
        log(`Viewport box: ${JSON.stringify(viewportBox)}`);

        // 检查 viewport 内部的 div 结构
        const viewportInnerDiv = await viewport.evaluate((el) => {
          const firstChild = el.firstElementChild;
          if (firstChild) {
            const computed = window.getComputedStyle(firstChild);
            return {
              tagName: firstChild.tagName,
              className: firstChild.className,
              width: computed.width,
              maxWidth: computed.maxWidth,
            };
          }
          return null;
        });
        log(`Viewport inner div: ${JSON.stringify(viewportInnerDiv)}`);

        // 检查按钮的父容器
        const buttonContainer = page.locator('aside [data-slot="scroll-area"] > div > div').first();
        const containerBox = await buttonContainer.boundingBox();
        log(`Button container box: ${JSON.stringify(containerBox)}`);

        const containerStyles = await buttonContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            width: computed.width,
            maxWidth: computed.maxWidth,
            paddingLeft: computed.paddingLeft,
            paddingRight: computed.paddingRight,
          };
        });
        log(`Container computed styles: ${JSON.stringify(containerStyles)}`);

        // 检查滚动条
        const scrollbar = page.locator('aside [data-slot="scroll-area-scrollbar"]').first();
        const scrollbarVisible = await scrollbar.isVisible().catch(() => false);
        log(`Scrollbar visible: ${scrollbarVisible}`);

        if (scrollbarVisible) {
          const scrollbarBox = await scrollbar.boundingBox();
          log(`Scrollbar box: ${JSON.stringify(scrollbarBox)}`);
        }
      } else {
        log('No title divs found in button');
      }
    }

    // 截图保存
    await page.screenshot({
      path: 'test-results/debug-overflow.png',
      fullPage: true
    });

    log('Screenshot saved to test-results/debug-overflow.png');

    // 写入日志文件
    fs.writeFileSync('test-results/debug-overflow.log', logs.join('\n'));
    log('Log saved to test-results/debug-overflow.log');

    // 保持浏览器打开以便检查
    await page.waitForTimeout(3000);
  });
});

