## Why

界面同时存在**两套互相矛盾的设计系统**：`src/components/ui/` 下的 shadcn 组件用"工具类 + 手写 `var()`"，`src/index.css`（2961 行）则保留了一整套自定义 token（`--acid`/`--ink`/`--panel`）与 124 个页面自建类，其中 `.primary-button`/`.ghost-button`/`.export-button` 仍在 13 处覆盖 shadcn Button 的外观。后果是可量化的：同一行按钮高度差 4px、圆角一个 999px 一个 10px、字重 500 vs 800；A4 列表行被 44px 图标盒子撑到 84px；图标尺寸有 6 种取值；40 处硬编码颜色违反已有的 `颜色 token 化` 要求。两轮 UI 收敛（`fd3261f` 引入 token 与 Button，`ed4917f` 事后修复被重构弄丢的亮色 token）证明**边改边留旧系统**的做法不收敛。

本次一次性把设计规范收敛到 shadcn，交互要求按 Apple HIG 补齐，不再保留中间态。

## What Changes

- **BREAKING**：`visual-system` 的组件要求由「公共 Button 组件 + 统一高度档位（默认 44px、大 52px、小 36px）」改为「一律使用 shadcn 官方组件与其 `variant`/`size` 档位」，尺寸为 shadcn 基准：`default` 36px、`sm` 32px、`lg` 40px、`icon` 36×36px。项目现存的 44/52/36 档位与 44px 可见命中区盒子取消。
- 颜色 token 结构改为与 shadcn 一致：建立 `--background`/`--foreground`/`--card`/`--popover`/`--primary`/`--secondary`/`--muted`/`--accent`/`--destructive`/`--border`/`--input`/`--ring`/`--warning`/`--chart-1..5`/`--sidebar-*` 等语义变量，并以 `@theme inline` 映射为 Tailwind 语义工具类；颜色改用 oklch；圆角收敛为单一 `--radius` 派生链。消除 40 处硬编码颜色。
- 主题机制遵循 shadcn 方案：以 `.dark` 类为键（`:root` 放亮色值、`.dark` 放暗色覆盖），引入 `next-themes`，移除自研 `ThemeProvider` 与 `data-theme` 属性。
- 组件层清零自建外观：删除 `.primary-button`/`.ghost-button`/`.export-button`（13 处）、移除 `<span>` 冒充按钮（3 处）与原生 `<button>`（10 处）；图标尺寸统一为 shadcn 的 `[&_svg]:size-4`；补充缺失的官方组件（`ToggleGroup`/`Toggle` 替换自建分段控件，`AlertDialog` 按需引入）。
- 新增 `interaction-modes` 能力，把 Apple HIG 的交互要求固化为规格：每个决策区域单一主操作、显式模式状态模型（非散落布尔量）、状态切换不移动稳定锚点（≤1px）、异步操作的单槽替换与防重复、失败说明未改变的内容并提供重试、取消保持上下文且不产生半成品。
- 明确不做：打印与 A4 版式（`@page`、`break-after`、210mm 物理尺寸、`transform: scale` 预览）、6 入口多页面架构、站点 URL 与 SEO 结构。shadcn 与 Apple 均无对应规范，重写只会降低可读性。

## Capabilities

### New Capabilities

- `interaction-modes`: 模式状态模型与状态转换契约 —— 每个决策区域的单一主操作、显式模式状态（而非散落布尔量）、状态切换时稳定锚点的几何保持、异步操作的单槽反馈与防重复、取消与失败的上下文保持。

### Modified Capabilities

- `visual-system`: 组件要求由「公共 Button + 统一高度档位（44/52/36px）」改为「shadcn 官方组件与档位（36/32/40/36px）」；颜色要求由「语义 CSS 变量 + 禁止硬编码」扩展为「与 shadcn 一致的 token 结构 + `@theme inline` 映射 + oklch」；主题差异由「集中在主题变量定义处」细化为「以 `.dark` 为键」；`44px 命中区` 要求改为「不小于视觉尺寸的命中区」，并按人类裁决记录移动端为次要目标。
- `confirmation`: 补入裁决结论 —— 破坏性确认 SHALL 继续使用非模态 Popconfirm（SHALL NOT 改为模态 AlertDialog），并明确其适用条件为「后果重要、不常见、且用户重新导入即可恢复」，与 Apple Alerts 所指的不可逆决策区分。
- `feedback`: 由「进行中状态与防重复」扩展为完整的单槽替换契约 —— 主操作、进度、成功、失败与重试 SHALL 在同一有界槽位内替换；失败 SHALL 说明哪些内容未被改变；异步期间 SHALL 保持身份与上下文可见。

## Impact

- 依赖：新增 `next-themes`；新增 shadcn 组件（`toggle-group`、`toggle`、`alert-dialog`），均来自官方注册表。
- 样式：`src/index.css` 由 2961 行收敛（token 段重写为 shadcn 结构 + `@theme inline`，删除旧按钮类与冗余页面类）；新增 shadcn 约定的 `:root`/`.dark` token 定义。
- 组件：`src/components/ui/*` 全部改用语义工具类；`src/components/{tool-header,batch-sampling-controls,text-overlay-panel,video-compressor,license-footer,tool-tabs,tool-links}.tsx` 与 `src/tools/**` 的原生按钮与自建类清零。
- 主题：`src/lib/theme.tsx` 由 `next-themes` 取代；`src/main.tsx` 的同步 `applyTheme` 调用改为 Provider 配置。
- 测试：`tests/theme-tokens-embed.test.mjs` 的 `[data-theme="light"]` 断言改为 `.dark`；新增 token 结构契约测试与交互模式契约测试；现有 `popconfirm`/`tool-header`/`A4ImageLayout` 等测试随尺寸与语义调整更新。
- 规格与文档：`visual-system`、`confirmation`、`feedback` 三份主 spec 更新与 `interaction-modes` 新增；`project-map.md` 的样式与组件段落同步。
- 不改变：路由与 6 入口结构、站点 URL 与 SEO、打印与 A4 版式、图片/视频处理管线的功能行为。
- 人类裁决记录：本次改造的范围与尺寸口径来自用户裁决（2026-09-17）——「web/PC、鼠标为主，页面精致优先于可操作性；Apple 仅取交互要求，设计规范统一用 shadcn」。残余影响：应用同时声明移动端支持（`min-width: 320px`、8 个窄视口断点、PWA standalone），36px 图标按钮低于 Apple 对触控的 44pt 建议，已记录为接受的取舍。
