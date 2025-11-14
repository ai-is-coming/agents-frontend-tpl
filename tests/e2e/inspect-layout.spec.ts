import { test } from '@playwright/test';

test('inspect layout', async ({ page }) => {
  await page.goto('http://127.0.0.1:5001/');
  await page.evaluate(() => {
    localStorage.setItem('token', 'fake-token-for-testing');
  });
  await page.reload();
  await page.waitForTimeout(2000);

  // Get page HTML
  const html = await page.content();
  console.log('=== PAGE HTML ===');
  console.log(html);

  // Find all buttons
  const buttons = await page.locator('button').all();
  console.log(`\n=== FOUND ${buttons.length} BUTTONS ===`);
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    console.log(`Button ${i}: text="${text}", class="${className}"`);
  }

  // Find aside
  const asides = await page.locator('aside').all();
  console.log(`\n=== FOUND ${asides.length} ASIDES ===`);

  // Find ChevronLeft icon
  const chevronLefts = await page.locator('svg').all();
  console.log(`\n=== FOUND ${chevronLefts.length} SVG ELEMENTS ===`);

  await page.screenshot({ path: 'test-results/inspect-layout.png', fullPage: true });
});

