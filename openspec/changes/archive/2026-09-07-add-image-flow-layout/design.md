## Context

上一变更 `add-image-a4-layout` 已实现：`A4ImageLayout` 用 CSS Grid 固定行列（`--a4-cols`/`--a4-rows`）渲染 210mm × 297mm 页面，分页纯函数 `paginate(count, cols, rows)` 按「容量=行列数乘积」切页，屏幕预览 transform 缩放、打印走 `window.print()` + `@media print`（A4 `@page` 顶层声明，见 src/index.css 尾部）。本变更把固定网格替换为「按每行张数流动排版」，只改 A4 排版这一条能力；导入/管理/边距/打印/SEO 管线全部沿用。动机见 proposal.md – Why。

## Goals / Non-Goals

**Goals:**
- 用户只设置「每行张数」（1–6，默认 3），排版与分页全部自动推导。
- 图片按各自宽高比完整显示，行高 = 该行最高图片，行内垂直居中，不裁切。
- 分页以整行为最小单位，行不跨页；末页可不满、无空白页。
- 屏幕预览与打印继续共用单套 DOM；打印仍为精确 A4。
- 分页/行布局计算继续收敛为纯函数，可单测。

**Non-Goals:**
- 拖拽排序、图片编辑、任一网格预设保留（已由用户确认替换）。
- 每行宽度配比（加权列宽）、行内图片间距可调。
- 打印尺寸按像素→mm 换算（300DPI 等）——按用户选择，图形按版面等比缩放。

## Decisions

### 1. 布局算法：等宽行 + 行高取最大（photo-wall flow）

给定行内容宽 `rowWidth = A4_MM.width - 2*marginMm`，每行 `cols` 张：每张宽 `cellW = rowWidth / cols`，高 `cellH_i = cellW * h_i / w_i`（由宽高比），行高 `rowH = max(cellH_i)`。行从页顶向下累积，`usedH + rowH > A4_MM.height - 2*marginMm` 时换页。行内图片垂直居中（flex align-items center）。

- 备选：行高均值（`sum(cellH)/cols`）—— 短图留白更多且易超页，拒绝。
- 备选：按宽高比「装箱」（bin packing）—— 更省纸但顺序不可预测，与「依次排列」冲突，拒绝。

**打印输出边界**：打印媒体下除既有隐藏项（顶部导航、动作按钮、列表/设置面板、footer 等）外，还必须隐藏预览面板标题行（`.image-panel-title`，含「A4 页面预览」、页码指示与翻页按钮）——打印文档中唯一流动内容必须是 `.a4-sheet` 序列，使打印文档总高精确 = 版面页数 × 297mm。此前该标题行（约 106px）残留在打印流中，会把 N 页版面溢出成 N+1 页，即用户所见「最后多一页空白页」；版面从每页顶部直接开始，无任何 UI 残留。

### 2. 纯函数 API：`paginateFlow(items, cols, pageMm, marginMm)`

`src/lib/a4-layout.ts` 移除 `GRID_PRESETS`/`GridPreset`/`DEFAULT_GRID_PRESET`，新增：

- `COLS_PER_ROW = { min: 1, max: 6, default: 3 }`
- `type FlowItem = { aspect: number }`（aspect = w/h；0 或空除以 1 兜底）
- `type FlowRow = { start: number; end: number; rowHeightMm: number }`（[start, end) 为行内图片下标）
- `paginateFlow(items: readonly { aspect: number }[], cols, marginMm, pageMm = A4_PAGE_MM): { rows: FlowRow[]; pages: Array<{ start: number; end: number }> }` —— 先切行（连续 cols 张一组），再按行高网格累加切页；`cols <= 0` 时按 1 处理；空输入返回空结构。

组件 `A4ImageLayout` 直接消费 `pages` 渲染每页的行序列，不再需要 `paginate(imageCount, cols, rows)`。`moveItem`/`clampIndex`/`MARGIN_MM` 保留。

### 3. 图片宽高比来源：解码一次并存下

`A4Item` 增加 `width/height`（naturalWidth/Height）：导入时用 `Image` 解码取尺寸（沿用 ImageProcessor 的 `loadImageAsset` 模式，`decoding="async"`、`onerror` 移除并提示「N 张图片无法解码」），解码后 `revokeObjectURL` 并保留 `<img>` 元素复用为预览（避免重复解码，打印仍按原始 `<img>`/objectURL 输出）。`useMemo` 依据 `items → aspects` 重算 `paginateFlow` 结果，页数/行分布随排序、移除、每行张数、边距即时更新。

- 备选：仅用 `onLoad` 里读 `naturalWidth` 而不持有 `<img>`——仍是一次解码但预览会再解码一次；采用复用方案。

### 4. 渲染：单 DOM 行布局替代 CSS Grid

`.a4-sheet` 的 Grid（`--a4-cols`/`--a4-rows`）改为纵向行容器：`.a4-flow-row`（flex，行高 = 该行 `--row-h` mm），`.a4-flow-cell`（flex: 1，居中，图片 `max-width/max-height: 100%` + `object-fit: contain`）。屏幕端行内短图上下留白即「垂直居中」，辅助线改为行/列间距虚线仅屏幕显示（打印关闭）。缩放、翻页、`.a4-sheet-hidden`、打印媒体规则不变；打印样式只需把行高 mm 值直接作为元素高度（`--row-h` 由行内最高图得出，行与行竖直堆叠，总高 ≈ 297mm 精确）。

- 风险缓解：行高含小数（mm 浮点），页面总高可能超 297mm 一丢丢——行高按 `Math.ceil(0.01)` 精度取整到 0.01mm，并在换页判定用 `> availableH + 0.05mm` 容差，避免尾页溢出。

### 5. 「每行张数」控件与文案

把 `A4GridPicker`（2×2/3×3/4×4 按钮组）替换为 `A4ColsPicker`（1–6 数字分段按钮，或 -/+ 步进控件；采用分段按钮，与现有 UI 语言一致）：值直接进 `paginateFlow`，`aria-label="每行张数"`。设置面板文案改为「每行张数」「×N 张 → M 页」实时摘要；`ToolHome`/`seo.ts`/静态入口 JSON-LD 中「2×2、3×3、4×4 网格预设」措辞更新为「每行张数自由排版」。

**页面布局**：A4 排版页不再展示大标题区（`image-heading` 的 eyebrow/`h1`/描述文案），页面从顶部导航下的操作区直接开始；保留顶部导航（`ToolHeader`）与模式 tab（图片压缩/添加水印/A4 排版）作为工具间切换入口。页面 SEO 依赖独立的 `<title>`/description/canonical，与页面内 `h1` 无关，移除不影响索引。

### 6. 状态保留与站点集成不变

`OfflineToolsApp` 常挂载 + `hidden` 显隐、路由/SEO/sitemap/构建入口全部沿用，无新增文件与依赖。

## Risks / Trade-offs

- [打印输出出现尾部空白页/第一页从标题开始] → 根因：打印流残留预览面板标题行（约 106px），使打印文档总高 ≠ 页数 × 297mm；缓解：打印媒体下隐藏 `.image-panel-title` 等全部 UI，仅保留 `.a4-sheet` 序列，并以「全幅打印态渲染总高 = 页数 × 297mm + PDF `/Count` = 版面页数」作为回归校验；tasks 新增 3.4 项验证。
- [行高含浮点导致打印尾页溢出/空白页] → 换页判定加 0.05mm 容差 + 行高 0.01mm 取整。
- [超宽/超高图片使单行高度超过整页] → 单行也不允许超过内容高度：行高 `min(rowH, availableH)` 且该行单独成页，图片保持比例（同页更大留白）；记录为已知取舍。
- [导入即解码造成大图内存开销] → 复用既有 ImageProcessor 模式（上限 6000 万像素拒绝），解码后持有单 `<img>` 元素复用，移除/清空时 revoke。
- [每行 1 张时打印页数显著增多] → 属预期行为，预览页码指示不变。
- [与未归档的上一个变更（add-image-a4-layout）同改 `image-a4-layout` 能力] → 归档顺序需先归档 `add-image-a4-layout`（其 REMOVED/MODIFIED delta 依赖目标主 spec 存在）；在变更说明中提示。

## Migration Plan

无数据/后端迁移。实现后 A4 排版页行为即时切换；回滚 = 恢复老提交（该工具为独立入口，不影响其他工具）。PWA 提示新版本，不打断在用用户。

## Open Questions

- 是否需要在行间也留出可调间距？——默认 0，后续可作增量（不改变当前方案）。
- 每行张数是否允许超过 6？——当前上限 6 是 A4 实用范围，改为 8 只需改常量，不影响设计。
