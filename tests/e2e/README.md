# E2E Tests for Session List UI

## Problem Description

These tests check session list UI issues:
1. Whether session list text is covered by scrollbar
2. Whether session list has visible scrollbar
3. Whether text truncation and padding are correct

## Running Tests

### Prerequisites

1. Ensure frontend development server is running:
```bash
cd agents-frontend-tpl
npm run dev
# Server should run at http://localhost:4000
```

2. Ensure backend server is running (if real API is needed):
```bash
cd agents-backend-tpl
npm run dev
```

### Run Tests (Headless Mode)

Run all tests in headless mode (browser not visible):

```bash
cd agents-frontend-tpl
npx playwright test tests/e2e/session-list-ui.spec.ts
```

### Run Tests (Headed Mode - Recommended for Debugging)

Run tests in headed mode (browser visible):

```bash
cd agents-frontend-tpl
npx playwright test tests/e2e/session-list-ui.spec.ts --config=tests/e2e/playwright.headed.config.ts --headed
```

### Run Individual Tests

Run specific test cases:

```bash
# Run only scrollbar visibility test
npx playwright test tests/e2e/session-list-ui.spec.ts -g "should have visible scrollbar"

# Run only text coverage test
npx playwright test tests/e2e/session-list-ui.spec.ts -g "should not be covered by scrollbar"

# Run visual inspection test (keeps browser open)
npx playwright test tests/e2e/session-list-ui.spec.ts -g "visual inspection" --headed
```

### Debug Mode

Debug using Playwright Inspector:

```bash
npx playwright test tests/e2e/session-list-ui.spec.ts --debug
```

### View Test Report

```bash
npx playwright show-report
```

## Test Case Descriptions

### 1. `session list should have visible scrollbar when content overflows`

Tests whether scrollbar displays correctly when there are many sessions.

**Checks:**
- Whether ScrollArea component is visible
- Whether content height exceeds viewport height
- Whether scrollbar is visible

### 2. `session list text should not be covered by scrollbar`

Tests whether session text with long titles is covered by scrollbar.

**Checks:**
- Whether Viewport has sufficient padding-right
- Whether there is gap between title text and scrollbar
- Whether text is properly truncated

### 3. `session list container should have proper layout`

Tests whether session list container layout is correct.

**Checks:**
- Whether Sidebar width is 280px
- Whether ScrollArea has flex-1 class
- Whether inner div padding is correct

### 4. `visual inspection - open browser to see session list`

Test for manual visual inspection, creates titles of various lengths and takes screenshots.

**Output:**
- Screenshot saved at `test-results/session-list-visual.png`

## Common Issues

### Q: Test fails, cannot connect to server

A: Ensure frontend development server is running at `http://localhost:4000`

### Q: How to modify test baseURL?

A: Edit `baseURL` configuration in `playwright.config.ts` or `playwright.headed.config.ts`

### Q: How to keep browser open for manual inspection?

A: Add `await page.waitForTimeout(30000)` in test code or use `--debug` mode

### Q: Test passes but I still see UI issues

A: Run test in headed mode and manually inspect, or check screenshots and video recordings

## Fix Suggestions

If tests find issues, possible solutions:

### Issue 1: Text covered by scrollbar

**Cause:** ScrollArea viewport doesn't have sufficient padding-right

**Fix:** Ensure viewport has sufficient padding in `components/ui/scroll-area.tsx`:

```tsx
<ScrollAreaPrimitive.Viewport
  className="... pr-3 md:pr-4" // Ensure right padding
>
```

### Issue 2: Scrollbar not visible

**Cause:** Possible ScrollArea component configuration or CSS style issue

**Fix:** Check ScrollArea usage in `components/chatbot/client-chat.tsx`:

```tsx
<ScrollArea className="flex-1">
  <div className="px-2 py-1 space-y-1">
    {/* session items */}
  </div>
</ScrollArea>
```

### Issue 3: Session button content overflow

**Cause:** Button inner div doesn't have correct padding or truncate

**Fix:** Ensure button and inner div have correct styles:

```tsx
<button className="w-full rounded-md px-3 py-2 text-left hover:bg-accent">
  <div className="truncate text-sm font-medium">{title}</div>
  <div className="truncate text-xs text-muted-foreground">{time}</div>
</button>
```

## Related Files

- `components/chatbot/client-chat.tsx` - Session list main component
- `components/ui/scroll-area.tsx` - ScrollArea component
- `lib/api/session.ts` - Session API calls

