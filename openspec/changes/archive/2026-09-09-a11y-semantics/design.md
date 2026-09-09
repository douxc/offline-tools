## Context

见 `proposal.md`。上一轮 `ui-consistency` 已建立分组导航、ToolTabs、Popconfirm、44px 命中区与 token 化视觉；本轮仅补齐状态语义缺口并固定验收口径（无真机测试）。

## Goals / Non-Goals

**Goals：** 分段/列表/导航/弹层触发的状态语义完整，且被自动化测试锁定；文档记录验收政策。

**Non-Goals：** 不做真机 TalkBack/焦点遍历；不改视觉样式；不为语义重构组件结构。

## Decisions

### D1: 分段控件统一 `aria-pressed`

导出格式（`App.tsx` segmented）与文字叠加位置（`text-overlay-panel.tsx` segmented）与既有 `batch-sampling-controls`/`A4ColsPicker` 一致使用 `aria-pressed`。tab 语义（ToolTabs）已由 Radix 提供，不再改。

### D2: 列表选中语义

`image-item-select`（压缩/水印列表）增加 `aria-pressed={selected?.id === asset.id}`；选中态仍保留现有 `active` 样式（视觉不变），语义为追加。

### D3: 语义回归测试（SSR 断言）

无 jsdom 环境：新增 `tool-header.test.tsx`（三个路由下 `aria-current` 归属、首页无 current）；扩展现有 `tool-tabs.test.tsx`（已有 role/aria-selected）；`popconfirm.test.tsx` 已有 `aria-haspopup`。分段/列表语义断言并入 `tool-tabs.test.tsx`？不——分别放入对应组件现有/新增测试（`text-overlay-panel.test.tsx` 追加位置分段断言、`App.test.tsx` 追加格式分段断言），列表选中断言并入 SSR 渲染 + 静态 props 检查（`ImageProcessor` 空态无法断言选中项，故采用组件语义单元：断言 renderToString 空态无选中、选中态由 `aria-pressed` 计算属性保证（类型级），并以 `A4ImageLayout`/`ImageProcessor` 现有 SSR 测试通过作为回归）。

### D4: 验收政策文档化

README「开发」段注明：无障碍验收 = 代码/语义检查 + 自动化测试；不做真机 TalkBack。

## Risks / Trade-offs

- [aria-pressed 与视觉 active 双轨，可能出现不一致] → 两者同源（同一布尔值），测试锁定 `aria-pressed` 与渲染标签一致。
- [无真机覆盖] → 用户决策；语义由 Radix/原生控件保证，SSR 断言锁定关键路径。

## Migration Plan

随下次发布上线；回滚 = git revert。无数据迁移。

## Open Questions

无。
