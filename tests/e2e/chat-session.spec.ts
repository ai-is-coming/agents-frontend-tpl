import { test, expect } from '@playwright/test'

// This test verifies we only create a chat session once when sending multiple messages
// in the same conversation (no clicking "New Chat").

test('reuses existing session when sending multiple messages', async ({ page }) => {
  // Set auth token before any app scripts run so API calls are authenticated
  await page.context().addInitScript(() => {
    window.localStorage.setItem('token', 'e2e@example.com')
  })

  // Count how many times the frontend calls session/create
  let createCount = 0
  await page.route('**/session/create', async (route) => {
    createCount += 1
    await route.continue()
  })

  // Open the app
  await page.goto('/')

  // Locate input textarea and submit button
  const textarea = page.getByPlaceholder('What would you like to know?')
  const submit = page.getByRole('button', { name: 'Submit' })

  // First message -> should create a session once
  await textarea.fill('First message from e2e test')
  await submit.click()

  // Give the app a moment to issue network calls
  await page.waitForTimeout(1200)

  // Second message -> should NOT create a new session
  await textarea.fill('Second message from e2e test')
  await submit.click()

  // Wait a bit for network calls
  await page.waitForTimeout(1200)

  // Small delay to ensure any extra create requests would have fired
  await page.waitForTimeout(500)

  // If there was already an existing session, createCount may be 0; otherwise it should be exactly 1.
  expect(createCount).toBeLessThanOrEqual(1)
})

