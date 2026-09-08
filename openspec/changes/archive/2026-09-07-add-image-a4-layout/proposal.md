## Why

用户有把本地照片、证件照或文档截图排到 A4 纸上打印的需求（如冲印合影、排版打印资料），现有工具集只覆盖取帧、压缩、水印，没有打印排版场景。目前这类工作要么借助会在网络上上传图片的在线服务，要么用桌面排版软件，与该站点"完全本地、不上传"的定位不符。新增一个纯浏览器端的 A4 排版打印工具，可以让用户导入本地图片、按网格拼排后直接调用浏览器打印，图片全程不离开设备。

## What Changes

- 新增第 6 个静态入口 `/image-a4-layout/`（图片 A4 排版打印），纯前端实现，**无新增 npm 依赖**。
- 批量导入本地图片（多选），仅通过本地 Blob URL 解码，不上传；支持移除单张、清空列表、上移/下移调整打印顺序。
- A4 版面：固定网格预设（2×2、3×3、4×4），图片在单元格内保持原始比例（contain，不裁切、不拉伸），可调页边距（毫米级）。
- 自动分页：超过单页容量的图片按网格顺序自动排到后续 A4 页面，每一页在屏幕上独立预览。
- 打印输出：调用浏览器打印对话框（`window.print()`），专用 `@media print` 样式隐藏界面元素，页面精确为 210mm × 297mm（`@page { size: A4; margin: 0 }` + 页面内边距实现页边距），避免浏览器默认页边距叠加。
- 站点集成：ToolHome 工具卡片、顶部导航、SEO（title/description/canonical/Open Graph/JSON-LD）、`sitemap.xml` 与 PWA 预缓存覆盖新入口。
- 文档：README 与 project-map 同步更新。

## Capabilities

### New Capabilities

- `image-a4-layout`: 本地图片导入与管理、A4 固定网格排版（网格预设、页边距、自动分页）、逐页预览与通过浏览器打印 A4 版面。

### Modified Capabilities

（无。仓库 `openspec/specs/` 当前没有任何既有 spec，本次不修改既有能力。）

## Impact

- 新增文件：
  - `image-a4-layout/index.html`（静态入口，含独立 SEO meta/OG/JSON-LD）
  - `src/tools/image-a4-layout/`（工具页面组件，含导入、排版预览、打印）
  - `src/lib/a4-layout.ts`（网格/边距/分页的纯计算逻辑）
  - 对应单元测试与构建产物校验测试
- 修改文件：
  - `vite.config.ts`：新增 `imageA4Layout` 构建入口
  - `src/lib/tool-navigation.ts`：`ToolRoute` 增加 `image-a4-layout`
  - `src/lib/seo.ts`：`SEO_PAGES` 与站点 JSON-LD 增加新页面
  - `src/OfflineToolsApp.tsx`：按路径渲染新工具组件
  - `src/ToolHome.tsx`：首页新增工具卡片
  - `public/sitemap.xml`：新增 `/image-a4-layout/` 条目
  - `README.md`、`project-map.md`：文档同步
- 依赖：无新增 npm 依赖；仅使用浏览器原生 `window.print()`、`createImageBitmap`/`Image` 解码与 CSS 打印媒体查询。
- 兼容性：A4 毫米级打印依赖浏览器对 `@page size` 的支持（Chrome/Edge/Firefox/Safari 均支持）；导出校验会以 Chrome 打印预览行为为准。
