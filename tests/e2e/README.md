# E2E Tests for Session List UI

## 问题描述

这些测试用于检查 session 列表的 UI 问题：
1. Session 列表文字是否被滚动条遮挡
2. Session 列表是否有滚动条显示
3. 文字截断和 padding 是否正确

## 运行测试

### 前提条件

1. 确保前端开发服务器正在运行：
```bash
cd agents-frontend-tpl
npm run dev
# 服务器应该运行在 http://localhost:4000
```

2. 确保后端服务器正在运行（如果需要真实 API）：
```bash
cd agents-backend-tpl
npm run dev
```

### 运行测试（Headless 模式）

在 headless 模式下运行所有测试（浏览器不可见）：

```bash
cd agents-frontend-tpl
npx playwright test tests/e2e/session-list-ui.spec.ts
```

### 运行测试（Headed 模式 - 推荐用于调试）

在 headed 模式下运行测试（可以看到浏览器）：

```bash
cd agents-frontend-tpl
npx playwright test tests/e2e/session-list-ui.spec.ts --config=tests/e2e/playwright.headed.config.ts --headed
```

### 运行单个测试

运行特定的测试用例：

```bash
# 只运行滚动条可见性测试
npx playwright test tests/e2e/session-list-ui.spec.ts -g "should have visible scrollbar"

# 只运行文字遮挡测试
npx playwright test tests/e2e/session-list-ui.spec.ts -g "should not be covered by scrollbar"

# 运行视觉检查测试（会保持浏览器打开）
npx playwright test tests/e2e/session-list-ui.spec.ts -g "visual inspection" --headed
```

### 调试模式

使用 Playwright Inspector 进行调试：

```bash
npx playwright test tests/e2e/session-list-ui.spec.ts --debug
```

### 查看测试报告

```bash
npx playwright show-report
```

## 测试用例说明

### 1. `session list should have visible scrollbar when content overflows`

测试当有很多 session 时，滚动条是否正确显示。

**检查项：**
- ScrollArea 组件是否可见
- 内容高度是否超过视口高度
- 滚动条是否可见

### 2. `session list text should not be covered by scrollbar`

测试长标题的 session 文字是否被滚动条遮挡。

**检查项：**
- Viewport 是否有足够的 padding-right
- 标题文字和滚动条之间是否有间隙
- 文字是否正确截断（truncate）

### 3. `session list container should have proper layout`

测试 session 列表容器的布局是否正确。

**检查项：**
- Sidebar 宽度是否为 280px
- ScrollArea 是否有 flex-1 class
- 内部 div 的 padding 是否正确

### 4. `visual inspection - open browser to see session list`

用于手动视觉检查的测试，会创建各种长度的标题并截图。

**输出：**
- 截图保存在 `test-results/session-list-visual.png`

## 常见问题

### Q: 测试失败，提示连接不上服务器

A: 确保前端开发服务器正在运行在 `http://localhost:4000`

### Q: 如何修改测试的 baseURL？

A: 编辑 `playwright.config.ts` 或 `playwright.headed.config.ts` 中的 `baseURL` 配置

### Q: 如何让浏览器保持打开状态以便手动检查？

A: 在测试代码中添加 `await page.waitForTimeout(30000)` 或使用 `--debug` 模式

### Q: 测试通过但我仍然看到 UI 问题

A: 使用 headed 模式运行测试并手动检查，或者查看截图和视频录制

## 修复建议

如果测试发现问题，可能的修复方案：

### 问题 1: 文字被滚动条遮挡

**原因：** ScrollArea 的 viewport 没有足够的 padding-right

**修复：** 在 `components/ui/scroll-area.tsx` 中确保 viewport 有足够的 padding：

```tsx
<ScrollAreaPrimitive.Viewport
  className="... pr-3 md:pr-4" // 确保有右侧 padding
>
```

### 问题 2: 滚动条不可见

**原因：** 可能是 ScrollArea 组件配置问题或 CSS 样式问题

**修复：** 检查 `components/chatbot/client-chat.tsx` 中的 ScrollArea 使用：

```tsx
<ScrollArea className="flex-1">
  <div className="px-2 py-1 space-y-1">
    {/* session items */}
  </div>
</ScrollArea>
```

### 问题 3: Session 按钮内容溢出

**原因：** 按钮内部的 div 没有正确的 padding 或 truncate

**修复：** 确保按钮和内部 div 有正确的样式：

```tsx
<button className="w-full rounded-md px-3 py-2 text-left hover:bg-accent">
  <div className="truncate text-sm font-medium">{title}</div>
  <div className="truncate text-xs text-muted-foreground">{time}</div>
</button>
```

## 相关文件

- `components/chatbot/client-chat.tsx` - Session 列表主组件
- `components/ui/scroll-area.tsx` - ScrollArea 组件
- `lib/api/session.ts` - Session API 调用

