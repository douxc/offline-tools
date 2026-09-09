## Context

见 `proposal.md` —— Why 与 What Changes。现状关键约束：

- 路由模型：`src/lib/tool-navigation.ts` 定义 `ToolRoute`/`TOOL_PATHS`/`readToolRoute`/`navigateToTool`（`pushState` + 手动 `popstate`，真实 `<a href>` 保留修饰键语义）。
- 导航现状：`ToolHeader` 渲染 2 个工具级链接（视频取帧/图片处理），图片页另有自绘 `.image-mode-tabs`（3 tab，无 `aria-current`）；`/video-compress/` 页 active 指向视频取帧（错误）。
- 反馈现状：视频两页自绘 `error-toast`（`role="alert"` div），图片页用 sonner；各自完成态不同。
- 图片工具三页由 `OfflineToolsApp` 常挂载 + `hidden` 显隐切换，切页不丢已导入图片；`A4ImageLayout` 的“清空”是按钮文字两段式（`pendingClear`），`ImageProcessor` 的清空是一次点击。
- 测试环境：Node 自带 test runner + `renderToString`（无 jsdom），测试文件显式列在 `package.json` test script。
- 视觉：`index.css`（3191 行）暗色默认 + `[data-theme="light"]` 覆盖补丁（多为硬编码灰阶的逐条覆盖）。

## Goals / Non-Goals

**Goals：**

- 一套可复用的「一级分组+二级工具 tab」导航（分组数据集中定义）。
- 统一风险操作确认（Popconfirm）、统一反馈（sonner）、统一工具链接与许可页脚组件。
- 视觉 token 化与控件统一（字号、颜色、圆角、按钮、命中区）。
- 修复视频压缩取消/卸载缺陷。

**Non-Goals：**

- 不改路由方案本身（仍为 6 静态入口 + pushState 客户端切换）。
- 不做新工具、不重设计品牌视觉（配色风格/字体族保持现有 SF 系风格）。
- 不改图片工具常挂载保状态的机制。
- 不引入 jsdom/vitest；测试继续用 node:test + renderToString。
- ICP 固定页脚保持独立组件不改（仅字号/命中区随视觉体系调整）。

## Decisions

### D1: 分组导航数据驱动 + 组点击跳到组默认页

在 `tool-navigation.ts` 增加 `TOOL_GROUPS`（`video`→`[video-frame, video-compress]`、`image`→`[image-compress, image-watermark, image-a4-layout]`，各带 `defaultRoute` 与 label）与 `toolGroupForRoute()`（home→null）。`ToolHeader` 改为渲染两个分组链接，当前组高亮 + `aria-current`；点击分组= `navigateToTool(event, group.defaultRoute)`。

- 备选：分组展开成下拉/二级菜单 —— 放弃（用户要求一级分组只有视频/图片，工具级用 tab）。
- 组点击目标：视频组→视频取帧，图片组→图片压缩（与首页卡片排序一致）。

### D2: 二级 tab 用 shadcn Tabs（Radix）+ asChild 链接

新增 shadcn `ui/tabs.tsx`（`@radix-ui/react-tabs`）与 `ToolTabs`（`src/components/tool-tabs.tsx`）：tabs 的 `value`= 当前 route，每个 `TabsTrigger asChild` 包 `<a href onClick={navigateToTool}>`。

- 理由：单一样式源（shadcn）、键盘左右键/`aria-selected` 由 Radix 提供；asChild 保留真实链接（中键/Cmd 打开新标签，与站点既有交互契约一致）。
- 备选：继续用自绘 `.image-mode-tabs` + 只加 aria —— 放弃（用户明确“优先 shadcn component”）。
- `ToolTabs` 用于：视频两页（新增）、图片压缩/水印（替换 `.image-mode-tabs`）、A4（替换 `.a4-mode-tabs`）；首页不显示二级 tab。

### D3: Popconfirm 基于 Radix Popover，非模态

新增 shadcn 风格 `ui/popconfirm.tsx`：`@radix-ui/react-popover`（trigger asChild、弹层含说明 + 取消/确认按钮、Escape/外点关闭、`onCloseAutoFocus` 焦点回触发按钮）。按钮 `Button` 新增 `destructive` variant（`--danger`）。应用 4 处：图片清空、A4 清空（删除 `pendingClear` 两段式）、视频页「重新选择」×2。

- 理由：用户决策（不用 dialog 强打断）；Popover 不改变页面布局（浮层锚定），满足“确认框不位移”要求。
- 单张移除/排序不加确认（需求明确）。

### D4: 反馈统一 sonner，按钮只保留“进行中”槽位

- 删除 `App.tsx`/`video-compressor.tsx` 的 `error` state 与自绘 `.error-toast` 渲染（及对应 CSS）；错误一律 `toast.error(信息, { description? })`。
- 异步进行中：按钮同槽位文案 + disabled（现状保留）；批量完成加 `toast.success`；单帧导出保留按钮瞬时成功态（2.4s，现状）。

### D5: 视频压缩取消/卸载修复

- 新增 `discardRef`：`cancelCompress()` 先置 true 再 `recorder.stop()`；`onstop` 内若 discard → 丢弃 chunks、不建 result、不 `link.click()`、不渲染结果。
- 卸载清理：现有 cleanup 增加 `recorderRef.current?.stop()`（stop 前同样置 discard），并复用现有 revoke 逻辑。
- 备选：stop 时加 `oncancel` 分支 —— MediaRecorder 无标准 cancel 事件，采用显式标记法更稳。

### D6: ToolLinks / LicenseFooter / A4 SEO 区块

- `tool-links.tsx`：`ToolLinks({ exclude })` 渲染全部 5 工具（`TOOL_PATHS` 驱动），排除当前页；数据来自 `seo.ts` 的展示名 + `TOOL_PATHS`。
- `ToolSeoContent` 改用 `ToolLinks`，并新增 `a4` 文案（A4 页补渲染该区块 → 页面结构与其余工具页一致）。
- `license-footer.tsx`：`LicenseFooter`（GPL 声明 + 第三方许可 + 对应源代码，`/legal/*` 相对路径）；6 页全量接入，替换 ToolHome/ImageProcessor 内联，视频两页与 A4 新增。
- 数据结构补全：`seo.ts` home `jsonLd` ItemList → 5 项；`index.html` 内联 JSON-LD 与 `<noscript>` 导航 → 5 项（静态 HTML 是爬虫可见版本，必须与客户端一致）。

### D7: 视觉体系（token 化 + 组件化）

- 文字：≥12px 下限；列表元信息去除 `nowrap+ellipsis`（允许换行）；等宽小字统一 12px。
- 颜色：组件样式中的硬编码灰阶（`#6f6f68` 等）替换为 `--muted/--soft-text/--panel*` 系列；**先变量化再删除**冗余 `[data-theme="light"]` 覆盖（这些覆盖多数只为硬编码灰做的暗→亮映射）。
- 圆角：只用 `--radius-*` token（清理 `rounded-[7px]` 等硬编码）。
- 按钮：交互按钮全部走 `Button` variants（`default/outline/ghost/secondary/destructive`），`export-button/ghost-button` 迁移；drop 卡内的“选择视频”是装饰性 span（外层已是 role=button），保留 span 但共享同一 token 化 `.button-base` 类，不再出现第三套按钮样式。
- 命中区：图标按钮视觉不变、命中区 ≥44px（列表行间距相应加高）；`theme-toggle` 44px；滑块根高度 ≥44px、拇指放大到 20px（视觉滑块保持 4px 轨）。
- 明暗主题：切换后无残留暗色硬编码块（靠变量化保证，不逐条覆盖）。

## Risks / Trade-offs

- [暗色硬编码灰遍布 3191 行 CSS，变量化时易漏] → Mitigation：先建“颜色清单”分组替换；完成后在 dev server 用亮/暗、宽/窄视口过一遍 6 页（任务 6.5）。
- [Radix Tabs asChild 的 `<a>` 被 Radix 覆盖 href/角色] → Mitigation：组件层面给 anchor 显式 `href`，并用 renderToString 断言 `href` 与 `role="tab"` 共存。
- [删除 error-toast 影响既有测试断言] → Mitigation：先跑 `pnpm test` 找出断言，更新为新行为（sonner 无法在 renderToString 下验证 → 测试改为“无自绘错误容器”）。
- [popconfirm 焦点管理在部分浏览器回退] → Radix Popover 默认 `onCloseAutoFocus`；保留手动 `onOpenAutoFocus` 聚焦“确认”按钮，Escape 由 Radix 处理。
- [改动跨 6 页，回归面大] → Mitigation：全部 SSR 测试 + `pnpm test` + `pnpm build` 门禁，最终人工矩阵。

## Migration Plan

单次发布：`pnpm build && pnpm test` 通过即上线；回滚 = `git revert`（一次提交包含全部 6 项变化，无数据迁移、无接口变更）。

## Open Questions

无（D1-D7 已覆盖全部待定行为；「图片组点击目标」等已在 D1 给定默认并记录）。
