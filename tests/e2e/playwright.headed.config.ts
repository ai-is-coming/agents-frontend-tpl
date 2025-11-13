import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for headed mode (browser visible)
 * Use this to visually inspect UI issues
 * 
 * Run with: npx playwright test --config=tests/e2e/playwright.headed.config.ts
 */
export default defineConfig({
  testDir: __dirname,
  fullyParallel: false, // Run tests sequentially for easier observation
  timeout: 120_000, // Longer timeout for manual inspection
  use: {
    baseURL: 'http://127.0.0.1:5001',
    trace: 'on',
    headless: false, // Show browser
    viewport: { width: 1280, height: 720 },
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

