## 1. 流动排版纯函数

- [x] 1.1 `src/lib/a4-layout.ts`：移除 `GRID_PRESETS`/`GridPreset`/`DEFAULT_GRID_PRESET`/`getGridPreset`/`paginate`；新增 `COLS_PER_ROW = { min: 1, max: 6, default: 3 }`、`FlowItem`（`aspect` = w/h）、`FlowRow`（`start`/`end`/`rowHeightMm`）与 `paginateFlow(items, cols, marginMm, pageMm)`（先按 cols 切行，再按行高累加切页，行高 0.01mm 取整、换页判定含 0.05mm 容差、空输入返回空结构、cols<=0 按 1 处理）；`moveItem`/`clampIndex`/`MARGIN_MM`/`A4_PAGE_MM` 保留；验证：`pnpm exec tsc -b` 通过
- [x] 1.2 重写 `src/lib/a4-layout.test.ts`：覆盖横竖混排行高取最大、cols=1/3/6、cols<=0 兜底、空输入、行不跨页（整行换页）、末页不满、恰好排满不产生空白页、0.01mm 取整与容差、`moveItem`/`clampIndex` 保留用例；验证：`node --import tsx --test src/lib/a4-layout.test.ts` 全绿

## 2. 组件改造（导入尺寸 + 行布局 + 每行张数控件）

- [x] 2.1 `A4ImageLayout.tsx`：`A4Item` 增加 `width`/`height`，导入时用 `Image` 解码一次取 naturalWidth/Height（`onerror` 移除并 toast「N 张图片无法解码」），解码后的 `<img>` 元素复用于列表与页面预览；验证：CDP 注入 11 张图后每个 item 记录尺寸、列表与预览正常显示
- [x] 2.2 页面渲染改为行流动结构：`.a4-flow-row`（行高 mm 由 `--row-h` 注入，flex 行内垂直居中）+ `.a4-flow-cell`（`flex: 1`，图片 `max-width/max-height: 100%` + `object-fit: contain`），屏幕显示行辅助虚线、打印关闭；验证：横版/竖版混排页面截图，图片不变形不裁切、行高为该行最高图
- [x] 2.3 设置面板：`A4GridPicker` 替换为 `A4ColsPicker`（1–6 分段按钮，默认 3，`aria-label="每行张数"`），边距滑块与打印按钮保留；验证：切到每行 2 张后行数变化、页面同步重排、切换工具后设置保留
- [x] 2.4 分页/预览消费 `paginateFlow`：按行分页结果渲染各页，翻页控件（第一页/最后一页禁用）沿用，非当前页经 `.a4-sheet-hidden` 隐藏；验证：11 张图每行 3 张时的页分布与页码指示正确、末位排序与移除后即时重排
- [x] 2.5 屏幕端移除页面大标题区（`image-heading` 的 eyebrow/`h1`/描述文案），保留 `ToolHeader` 顶部导航与模式 tab；验证：页面刷新后从内容区直接开始、无大标题残留，工具切换与打印不受影响

## 3. 打印回归

- [x] 3.1 `src/index.css`：`.a4-sheet` 由固定 Grid 改为行堆叠容器（行高来自布局计算），打印媒体规则（`@page size A4 margin 0`、非末页 `break-after: page`、hidden 页恢复输出、辅助线关闭、`transform: none`）保持；**同时把预览面板标题行（`.image-panel-title` 及页码/翻页控件）加入打印隐藏集**；验证：headless Chrome `printToPDF`（`preferCSSPageSize`）产物 MediaBox 为 A4（594.96 × 841.92pt）、`/Count` 与版面页数一致、无空白尾页、版面从页顶直接开始
- [x] 3.2 打印分辨率：图片仍以 objectURL 原图参与打印；验证：2000×1200 测试图打印后边缘清晰（打印态截图）
- [x] 3.3 交互回归（CDP）：导入 11 张 → 每行 3 张排 2 页 → 切换每行 2 张 → 页数与行分布更新 → 上移/移除/清空（两步确认）行为正确 → A4 → 图片压缩 → A4 状态保留（含每行张数设置）
- [x] 3.4 无空白页/无 UI 残留回归：全幅（不裁切）打印态渲染验证——打印文档总高 = 版面页数 × 297mm、打印媒体下不再存在 `.image-panel-title` 可见元素、`printToPDF` 产物 `/Count` = 版面页数且末页为内容页；验证：headless Chrome 打印态整页截图 + PDF 解析（复用上次校验脚本）

## 4. 文案与站点

- [x] 4.1 更新 `src/lib/seo.ts`、`image-a4-layout/index.html`、`src/ToolHome.tsx`：删除「2×2、3×3、4×4 网格」表述，改为「每行张数流动排版」；验证：构建产物中不再出现网格预设描述，build-output 测试通过
- [x] 4.2 更新 `README.md` 与 `project-map.md`（排版规则与模块描述改为按行流动）；验证：文档与实现一致
- [x] 4.3 全量质量门：`pnpm lint`、`pnpm test`（含 `pnpm build`）退出码 0；验证：三条命令通过

## 5. 测试补充

- [x] 5.1 `A4ImageLayout.test.tsx`：`A4ColsPicker` 渲染 1–6 且默认 3 激活（`aria-pressed`）；行布局 sheet 渲染行高/图片数；非当前页 `a4-sheet-hidden`；翻页边界禁用；验证：`pnpm test` 全绿
- [x] 5.2 在 PR/变更说明中记录：打印 PDF 回归（A4 尺寸、页数、分辨率、无 UI 残留、无空白尾页）与交互验证结果（复用 headless Chrome 校验脚本）
