## Why

无障碍验收口径调整为「代码/语义支持 + 自动化测试，不做真机 TalkBack 测试」（用户决策）。复核发现上一轮视觉统一后仍有 3 处交互状态未暴露给辅助技术：导出格式分段（PNG/JPG/WebP）、文字叠加位置分段缺 `aria-pressed`，图片列表选中项（`image-item-select`）仅靠背景色区分、无选中语义。这些缺口在纯语义验收下即判定为缺陷。

## What Changes

- 导出格式分段按钮与文字叠加位置分段按钮补充 `aria-pressed`（与同为分段控件的批量抽帧/每行张数一致）。
- 图片列表选中项按钮暴露 `aria-pressed` 选中态（压缩/水印页）。
- 新增语义回归测试：分组导航 `aria-current`、ToolTabs `role="tab"`/`aria-selected`、分段 `aria-pressed`、Popconfirm 触发 `aria-haspopup`、选中项语义（SSR 断言，不依赖浏览器）。
- 文档记录验收政策：无障碍验收 = 代码/语义 + 自动化测试，不做真机 TalkBack（README）。

## Capabilities

### New Capabilities

- `a11y-semantics`: 交互控件的可访问状态语义（分段选中、列表选中、当前页、弹层触发）及其自动化回归。

### Modified Capabilities

- `visual-system`: 无变更（命中区/字号要求不变；本次不修改其 spec）。

## Impact

- 修改：`src/App.tsx`（格式分段）、`src/components/text-overlay-panel.tsx`（位置分段）、`src/tools/image-processor/ImageProcessor.tsx`（列表选中语义）
- 新增：`src/components/tool-header.test.tsx`（导航语义回归）；`README.md` 验收政策说明
- 测试：`package.json` test script 追加新测试文件
