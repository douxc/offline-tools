## Context

站点已是纯浏览器端多入口 SPA（Vite 构建 5 个静态 HTML 入口，均加载 `src/main.tsx` → `OfflineToolsApp` 按 pathname 路由）。图片压缩与水印共用 `ImageProcessor` 组件，因路由切换时组件类型不变而保持挂载，从而在两者间切换不丢已导入图片。SEO 由静态入口 HTML 的 meta/JSON-LD + `src/lib/seo.ts` 的 `useRouteSeo` 双份维护；PWA 通过 vite-plugin-pwa 预缓存（`globPatterns` 含 html）。新工具完全沿既有模式扩展，无后端、无上传。动机见 proposal.md – Why；行为契约见 specs/image-a4-layout/spec.md。

## Goals / Non-Goals

**Goals:**
- 用浏览器原生打印能力输出精确 210mm × 297mm 的 A4 版面，零新增 npm 依赖。
- 屏幕预览与打印结果共用同一份 DOM 结构，避免两套渲染产生差异。
- 将分页/网格计算收敛为纯函数以便单元测试。
- 与既有图片工具一致：本地 Blob URL、图片类工具间切换不丢状态。

**Non-Goals:**
- 导出 PDF 文件（用户已选定打印对话框方案）。
- 图片编辑（裁切、旋转、滤镜、水印）、拖拽排序（用上移/下移按钮代替）。
- A5/B5/Letter 等其他纸张尺寸、边距非对称设置。
- 打印颜色管理（ICC/色彩空间转换）。

## Decisions

### 1. 打印输出：window.print() + @media print，无双套 DOM

页面容器（210mm × 297mm、`box-sizing: border-box`、内边距即页边距）同时用于屏幕预览与打印。屏显用 `transform: scale(k)` 等比缩小（外层占位容器保持缩放后高度），`@media print` 中复位 `transform: none` 并关闭缩放。`@page { size: A4; margin: 0 }`，`body` 打印态 `margin: 0`；除最后一页外每页 `break-after: page`，页面容器 `overflow: hidden` 防止 1px 溢出产生空白尾页。应用 UI（顶部导航、控件、页脚）统一 `print:hidden`。

- 备选：canvas 逐页绘制后打印 —— 拒绝，需管理高 DPI 缩放且打印质量依赖 resize 实现。
- 备选：jsPDF/pdf-lib 生成 PDF —— 拒绝，引入新依赖且与用户选择（打印对话框）不符。

### 2. 网格与图片适配：CSS Grid + `<img object-fit: contain>`

单元格由 CSS Grid 按行列数均分（留 0 内距，图片自动居中并保持比例），不做 canvas 重绘。图片以 `URL.createObjectURL(file)` 直接作为 `<img src>`，`object-fit: contain` 完整显示不裁切；打印时浏览器按原始分辨率参与排版，无需额外解码。屏幕预览可用虚线框展示网格辅助线，打印态隐藏。

- 备选：decode → canvas 绘制缩略图 —— 拒绝，多一次解码与内存占用，且打印若复用缩略图会损失分辨率；若分两套又违反决策 1。

### 3. 分页与网格计算：纯函数库 `src/lib/a4-layout.ts`

`paginate(imageCount, cols, rows)` 返回每页应展示的图片下标段（最后一页可不满，无空白页）；网格预设常量 `GRID_PRESETS = [{cols, rows}, ...]`（2×2、3×3、4×4，默认 3×3）；边距采用 5–25mm（默认 10mm）滑块，mm 值直接进页面容器 padding。渲染组件只消费计算结果，计算逻辑可独立单测。

### 4. 图片工具状态保留：常挂载 + hidden 显隐

`OfflineToolsApp` 图片分支改为将 `ImageProcessor`（压缩/水印）与新的 A4 排版组件同时挂载，按当前路由用 `hidden` 属性切换可见性。这样 A4 组件与 ImageProcessor 都不会在图片工具间互切时卸载，状态（含导入图片）全程保留，并把现有「压缩↔水印不丢状态」的行为一致扩展到 A4 工具。

- 备选：模块级状态存储（A4 组件卸载时写回、挂载时恢复）—— 拒绝，引入新状态管理模式，且无法同样保留 ImageProcessor 的状态。

### 5. 站点集成：按既有模式新增第 6 个入口

- `vite.config.ts` rollup `input` 增加 `imageA4Layout: image-a4-layout/index.html`。
- `image-a4-layout/index.html`：完整复制现有入口的 meta/OG/Twitter/canonical/JSON-LD 结构，页面标题「图片 A4 排版打印」。
- `src/lib/tool-navigation.ts`：`ToolRoute` 增加 `image-a4-layout`（路径 `/image-a4-layout/`），`readToolRoute` 增加后缀匹配。
- `src/lib/seo.ts`：`SEO_PAGES` 增加新条目（title/description/canonical/JSON-LD 引用现有模式）。
- `src/ToolHome.tsx`：新增工具卡片；`public/sitemap.xml`：新增 URL；README/project-map 同步。
- 无新增 npm 依赖（仅 `window.print()`、`URL.createObjectURL`、原生 `<img>`）。

### 6. 图片导入与错误处理

`<input type="file" multiple accept="image/*">` 收集 File 列表（按选中顺序），不批量预解码；`<img>` 加载失败（`onerror`）时跳过该张并提示「N 张无法解码」。移除/清空时 `revokeObjectURL` 释放。EXIF 旋转交给浏览器默认的 `image-orientation: from-image`。

## Risks / Trade-offs

- [部分浏览器打印预览出现多余空白尾页] → 页面容器 `overflow: hidden`、body 打印态 margin 0、仅非末页 `break-after: page`；tasks 中包含用真实打印预览人工验证的步骤，如有偏差则微调页面高度并记录。
- [屏显缩放与打印效果存在细微差异] → 共用 DOM，屏显只多网格辅助线与 transform 缩放，打印态两者均关闭，差异面最小化。
- [超大批量图片造成内存压力] → 不做全量解码与缩略图复制，直接用 objectURL；每张移除时 revoke；列表超长时预览页数自然增加，不做额外限制（记录为已知取舍）。
- [`@page size` 在个别浏览器（旧版 Safari）支持不全] → 目标环境以 Chrome/Edge 打印预览为准，Firefox 基本支持；不支持时退化为用户自选纸张（A4）且内容仍按 mm 排版，属可接受降级。
- [打印必须清除 transform 缩放，否则输出被缩小] → `@media print` 中强制 `transform: none` 并被 review/tasks 覆盖。
- [ImageProcessor 常挂载后资源占用更高] → 仅在图片工具分支常挂载两个组件，隐藏态不渲染（列表不滚动），开销可忽略。

## Migration Plan

无后端与数据迁移。发布后新增 `/image-a4-layout/` 静态页面；旧版本服务仍在运行（静态文件）。回滚：移除该 entry/路由改动并重新构建即可，不影响其他页面。PWA 通过 `registerType: "prompt"` 提示新版本，不打断正在使用的用户。

## Open Questions

- 是否追加 5×5/6×6 等更多网格预设或「每页 1 张大图」模式 —— 可在后续迭代增加，不影响当前设计。
- 是否需要「图片下方标注文件名/序号」开关 —— 用户已确认仅图片排列；如后续需要，作为独立增量实现。
