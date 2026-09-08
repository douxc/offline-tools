## 1. 排版计算库（纯函数）

- [x] 1.1 新增 `src/lib/a4-layout.ts`：`GRID_PRESETS`（2×2、3×3、4×4，默认 3×3）、`MARGIN_MIN/MAX/DEFAULT`（5–25mm，默认 10mm）、`paginate(imageCount, cols, rows)` 返回每页图片下标段（末页可不满、无空白页、0 张返回空数组）；验证：新增 `src/lib/a4-layout.test.ts` 覆盖 0/1/整除/超出/重排后重算等用例且 `pnpm test` 通过
- [x] 1.2 将 `src/lib/a4-layout.test.ts` 加入 `package.json` 的 `test` 脚本文件列表（该脚本显式枚举测试文件）；验证：`pnpm test` 运行时新测试被执行并全部通过

## 2. 工具组件（导入与图片管理）

- [x] 2.1 新增工具组件 `src/tools/image-a4-layout/A4ImageLayout.tsx`：多选文件导入（`accept="image/*"`）、列表展示缩略图与文件名、按选中顺序排列；验证：手动导入 10 张图片，列表顺序与文件选择顺序一致
- [x] 2.2 实现移除单张、清空（需确认）、上移/下移排序；每张移除时 `revokeObjectURL`；验证：操作后顺序与分页立即更新，DevTools 中无废弃 objectURL 泄漏
- [x] 2.3 加载失败处理：`<img>` `onerror` 时跳过该张并提示「N 张图片无法解码」，其余图片正常导入；验证：导入一个损坏的 .jpg 与若干正常图片，提示出现且正常图片全部入列
- [x] 2.4 空列表状态：无图片时禁用打印与清空按钮并显示引导文案；验证：导入前两个按钮为禁用态，导入后恢复

## 3. 预览与打印

- [x] 3.1 页面预览：按 `paginate` 结果渲染 A4 页面容器（210mm × 297mm、`box-sizing: border-box`、padding 为当前边距 mm 值、CSS Grid 按 cols×rows 均分、`<img object-fit: contain>` 不裁切），屏幕端 `transform: scale(k)` 等比缩小并显示网格辅助线；验证：3×3 网格导入 10 张显示 2 页、预览中图片不变形不裁切（含横版图片入竖版单元格）
- [x] 3.2 翻页控件：上一页/下一页按钮与「第 N/M 页」指示，边界（第一页/最后一页）按钮禁用；边距滑块（5–25mm）实时重排；验证：3 页版面可逐页切换，边距从 10mm 调至 20mm 后所有页面单元格同步缩小
- [x] 3.3 打印样式：应用 UI（顶部导航、控件、页脚）`print:hidden`；`@media print` 中 `@page { size: A4; margin: 0 }`、`body { margin: 0 }`、页面容器 `break-after: page`（末页 auto）与 `overflow: hidden`、复位 `transform: none`；打印按钮调用 `window.print()`；验证：Chrome 打印预览输出 N 页 A4、无界面元素、无空白尾页，并抽查 Firefox 打印预览
- [x] 3.4 打印分辨率：打印时图片按原始分辨率渲染（复用 objectURL，不做屏幕缩略图降级）；验证：打印预览放大检查 2000px 宽图片边缘清晰、无模糊

## 4. 站点集成

- [x] 4.1 新增 `image-a4-layout/index.html`：复制现有入口结构（viewport/theme-color/description/keywords/robots/OG/Twitter/canonical/JSON-LD/icon/字体与脚本引用），标题与描述为「图片 A4 排版打印」，URL 使用 `SITE_URL/image-a4-layout/`；验证：构建后页面源码中 meta 与 JSON-LD 齐全且 URL 正确
- [x] 4.2 `vite.config.ts` 的 rollup `input` 增加 `imageA4Layout` 入口；验证：`pnpm build` 生成 `dist/image-a4-layout/index.html` 且 bundle 正常
- [x] 4.3 `src/lib/tool-navigation.ts`：`ToolRoute` 与 `TOOL_PATHS` 增加 `image-a4-layout`（`/image-a4-layout/`），`readToolRoute` 增加后缀匹配；验证：`src/ToolHome.test.tsx` 与导航相关测试通过，直接访问 `/image-a4-layout/` 渲染工具页
- [x] 4.4 `src/OfflineToolsApp.tsx`：图片工具分支改为常挂载 `ImageProcessor` 与 A4 组件并按路由 `hidden` 显隐；验证：A4 导入 10 张 → 切到图片压缩 → 切回 A4，图片与网格设置仍在（与压缩↔水印既有行为一致）
- [x] 4.5 `src/lib/seo.ts`：`SEO_PAGES` 与 JSON-LD 增加新页面条目；验证：页面 title/description/canonical 在 `/image-a4-layout/` 路由下正确
- [x] 4.6 `src/ToolHome.tsx` 增加工具卡片；`public/sitemap.xml` 增加 `/image-a4-layout/` URL；验证：首页点击卡片无刷新跳转且渲染工具，sitemap 可被解析且 URL 正确
- [x] 4.7 更新 `README.md`（工具列表、静态页面、功能说明）与 `project-map.md`（架构、路由、公共组件段落）；验证：文档描述与实现一致、无过时陈述

## 5. 测试与构建校验

- [x] 5.1 为 A4 组件补充交互测试（导入后页数、重排、移除、打印按钮禁用态、翻页边界），沿用现有 `*.test.tsx` 同目录模式并加入 `package.json` 的 `test` 文件列表；验证：`pnpm test` 全部通过
- [x] 5.2 扩展或新增 `tests/` 构建产物校验：`dist/image-a4-layout/index.html` 存在、含 canonical/OG/JSON-LD 且 URL 指向 `/image-a4-layout/`；验证：`pnpm test` 中该校验通过
- [x] 5.3 全量质量门：`pnpm lint`、`pnpm test`、`pnpm build` 全部通过；验证：三条命令均以退出码 0 结束
- [x] 5.4 真实打印人工验证：导入横版/竖版/透明 PNG 混合图片，在 Chrome 打印预览核对页数、A4 尺寸、边距、无空白页、无 UI 元素、无裁切，记录验证结果于 PR 描述
