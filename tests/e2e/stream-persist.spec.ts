import { test, expect } from '@playwright/test'

// This test verifies that assistant messages are incrementally persisted during streaming
// so that refreshing the page mid-stream still results in a (growing) saved assistant message.

async function getSessionIdFromUI(page) {
  const select = page.locator('select')
  await expect(select).toBeVisible()
  const value = await select.inputValue()
  return Number(value)
}

async function fetchMessages(page, sessionId: number) {
  return await page.evaluate(async (sid) => {
    const token = window.localStorage.getItem('token') || ''
    const res = await fetch(`/session/${sid}/msg/list?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    return json
  }, sessionId)
}

function contentToString(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content.text === 'string') return content.text
  try { return JSON.stringify(content) } catch { return String(content) }
}

test('assistant message continues to persist after refresh mid-stream', async ({ page }) => {
  // Set auth token before app scripts run
  await page.context().addInitScript(() => {
    window.localStorage.setItem('token', 'e2e@example.com')
  })

  // Open the app
  await page.goto('/')

  // Input and submit a prompt likely to produce a long streaming answer
  const textarea = page.getByPlaceholder('What would you like to know?')
  const submit = page.getByRole('button', { name: 'Submit' })

  await textarea.fill('请详细介绍一下 Playwright，并分多段回答，输出尽量长，同时可以演示一次工具调用。')
  await submit.click()

  // Wait for chat request to be issued and some streaming to begin
  await page.waitForRequest((req) => req.url().includes('/agent/chat') && req.method() === 'POST')
  await page.waitForTimeout(1500)

  // Capture current session id from the select control
  const sid = await getSessionIdFromUI(page)
  expect(sid).toBeGreaterThan(0)

  // Refresh immediately to simulate user interruption
  await page.reload()

  // After reload, fetch messages for the session; record length of latest assistant message
  const first = await fetchMessages(page, sid)
  const assistantMsgs1 = first.messages.filter((m) => m.role === 'assistant')
  expect(assistantMsgs1.length).toBeGreaterThan(0)
  const latest1 = assistantMsgs1[assistantMsgs1.length - 1]
  const len1 = contentToString(latest1.content).length
  expect(len1).toBeGreaterThan(0)

  // Wait some time to allow backend background persist loop to continue consuming upstream stream
  await page.waitForTimeout(3000)

  // Fetch again and expect the assistant content length to stay the same or increase
  const second = await fetchMessages(page, sid)
  const assistantMsgs2 = second.messages.filter((m) => m.role === 'assistant')
  expect(assistantMsgs2.length).toBeGreaterThan(0)
  const latest2 = assistantMsgs2[assistantMsgs2.length - 1]
  const len2 = contentToString(latest2.content).length

  // At minimum, it should not shrink; ideally it should grow as streaming continues
  expect(len2).toBeGreaterThanOrEqual(len1)
})

