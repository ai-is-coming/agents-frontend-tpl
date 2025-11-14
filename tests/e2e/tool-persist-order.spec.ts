import { test, expect } from '@playwright/test'

async function getSessionIdFromUI(page) {
  const select = page.locator('select')
  await expect(select).toBeVisible()
  const value = await select.inputValue()
  return Number(value)
}

async function fetchMessages(page, sessionId: number) {
  return await page.evaluate(async (sid) => {
    const token = window.localStorage.getItem('token') || ''
    const res = await fetch(`/session/${sid}/msg/list?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    return json
  }, sessionId)
}

function pickFirst<T>(arr: T[], pred: (x: T) => boolean): T | undefined {
  for (const x of arr) if (pred(x)) return x
  return undefined
}

test('tool messages are persisted and order is text -> tool -> text', async ({ page }) => {
  // Set auth token before app scripts run
  await page.context().addInitScript(() => {
    window.localStorage.setItem('token', 'e2e@example.com')
  })

  await page.goto('/')

  // Enable Search to increase likelihood of tool usage
  const searchBtn = page.getByRole('button', { name: 'Search' })
  await searchBtn.click()

  const textarea = page.getByPlaceholder('What would you like to know?')
  const submit = page.getByRole('button', { name: 'Submit' })

  await textarea.fill('Please demonstrate a tool call: first output some explanatory text, then call the tool, and finally output a conclusion.')
  await submit.click()

  await page.waitForRequest((req) => req.url().includes('/agent/chat') && req.method() === 'POST')

  // Poll for tool message to appear in backend messages
  const sid = await getSessionIdFromUI(page)
  expect(sid).toBeGreaterThan(0)

  let toolAppeared = false
  for (let i = 0; i < 20; i++) {
    const res = await fetchMessages(page, sid)
    const toolMsgs = res.messages.filter((m) => m.role === 'tool')
    if (toolMsgs.length > 0) { toolAppeared = true; break }
    await page.waitForTimeout(300)
  }
  expect(toolAppeared).toBeTruthy()

  // Wait a bit more for post-tool text to arrive
  await page.waitForTimeout(2000)

  const res = await fetchMessages(page, sid)
  const ids = res.messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
  const firstTool = pickFirst(ids, (m) => m.role === 'tool')
  expect(firstTool).toBeTruthy()

  // Expect there is assistant text before and after the tool message (order preserved by ascending id)
  const beforeText = pickFirst(ids, (m) => m.role === 'assistant' && m.id < firstTool!.id && typeof (m.content?.text || m.content) === 'string' && (m.content?.text || m.content).length > 0)
  const afterText = pickFirst(ids, (m) => m.role === 'assistant' && m.id > firstTool!.id && typeof (m.content?.text || m.content) === 'string' && (m.content?.text || m.content).length > 0)
  expect(beforeText).toBeTruthy()
  expect(afterText).toBeTruthy()

  // Reload page and ensure Tool UI still rendered
  await page.reload()
  await expect(page.getByText('Tool:')).toBeVisible({ timeout: 5000 })
})

