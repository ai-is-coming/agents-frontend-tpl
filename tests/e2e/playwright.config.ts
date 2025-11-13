import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: __dirname,
  fullyParallel: true,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5001',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

