## Why

站点 6 个入口由不同时期叠加而成：导航信息架构不一致（顶部导航缺「视频压缩」、`/video-compress/` 页当前页指示错误）、同类操作交互分裂（清空图片有无确认、错误反馈两套系统、模式 tab 两套实现）、工具相关链接与首页 JSON-LD 缺 2 个新工具、页脚与文字/颜色/圆角体系不统一。这些问题让用户对「同一款产品」产生接近与戒备并存的割裂感，也让后续新增工具时的复制成本升高。本次以一次横向统一把界面拉回同一套设计语言与交互契约。

## What Changes

- **分组导航**：顶部导航改为一级「视频 / 图片」两组（视频组含视频取帧、视频压缩；图片组含图片压缩、添加水印、A4 排版），修正 `/video-compress/` 页 active/`aria-current` 指向错误。
- **统一二级 tab（shadcn Tabs）**：视频两页新增「视频取帧 / 视频压缩」二级 tab，图片三页现有 `image-mode-tabs` 迁移到同一组件，A4 页复用；选中有 `aria-current`/`aria-selected` 语义。
- **风险操作二次确认（Popconfirm，非 dialog 强打断）**：图片列表清空（压缩/水印）、A4 清空（替换现按钮两段式）、视频两页「重新选择」共 4 处；单张移除与排序不确认（高频低风险）。
- **反馈统一 sonner**：删除视频两页自绘 `error-toast`，错误与完成提示全部走 sonner；按钮内「进行中」状态保留（同一槽位）；修复「停止压缩」仍会下载半成品、页面卸载后 MediaRecorder 未停止的缺陷。
- **工具链接补全 + 公共组件**：`ToolSeoContent` 相关链接抽成公共 `ToolLinks`（全量 5 工具、排除自身），补全 `SEO_PAGES` 首页与 6 个 `index.html` 静态 JSON-LD、`<noscript>` 导航中缺失的视频压缩与 A4 排版。
- **页脚统一**：`LicenseFooter` 公共组件（GPL 声明 + 第三方许可 + 对应源代码），首页、图片页、视频页全量接入；ICP 固定页脚保持独立。
- **视觉体系统一**：文字最小 12px 字阶；硬编码灰收敛进语义色变量、收敛 `[data-theme="light"]` 补丁；圆角只用 token；页内 `primary-button`/`export-button`/`ghost-button` 迁移到 shadcn `Button` variants；图标按钮命中区 ≥44px、Slider 扩大热区。
- 依赖：新增 `@radix-ui/react-tabs`、`@radix-ui/react-popover`（shadcn tabs / popconfirm）。

## Capabilities

### New Capabilities

- `navigation`: 分组导航（视频/图片）与各工具页统一二级 tab 的显示、选中与当前页语义。
- `confirmation`: 风险操作（清空列表、重新选择）的 Popconfirm 二次确认行为。
- `feedback`: 全站反馈统一（sonner 错误/完成提示、按钮内进行中状态）及视频压缩取消失效缺陷。
- `site-content`: 公共工具链接（全量 5 工具、排除自身）与公共许可页脚，及缺失链接/结构化数据补全。
- `visual-system`: 视觉体系统一（字阶、颜色 token、圆角、按钮组件、命中区 ≥44px）。

### Modified Capabilities

（无。现有 `image-a4-layout` spec 的版面/打印要求不变；A4 清空确认行为归入 `confirmation`。）

## Impact

- 新增：`src/components/ui/tabs.tsx`、`src/components/tool-tabs.tsx`、`src/components/ui/popconfirm.tsx`、`src/components/tool-links.tsx`、`src/components/license-footer.tsx`
- 修改：`tool-header.tsx`、`tool-navigation.ts`、`App.tsx`、`video-compressor.tsx`、`ImageProcessor.tsx`、`A4ImageLayout.tsx`、`ToolHome.tsx`、`tool-seo-content.tsx`、`seo.ts`、`index.html`（×6 静态 JSON-LD/noscript）、`index.css`、`package.json`、相关 `*.test.*`、`project-map.md`/`README.md`
