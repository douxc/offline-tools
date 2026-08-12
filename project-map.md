# project-map

## 架构

完全在浏览器本地运行的视频/图片离线工具，无后端、无上传，文件经 Blob URL 解码与处理。多入口 SPA：4 个静态 HTML 入口（`/`、`/video-frame/`、`/image-compress/`、`/image-watermark/`）各自携带唯一的 SEO meta 与 JSON-LD，但都加载同一个 `src/main.tsx`。`src/OfflineToolsApp.tsx` 按 `window.location.pathname` 选择渲染 `ToolHome`（`src/ToolHome.tsx`）、`FrameExtractor`（`src/App.tsx`）或 `ImageProcessor`（`src/tools/image-processor/ImageProcessor.tsx`）。站点部署地址 `https://framecut-offline.douxc512.chatgpt.site`（`src/lib/seo.ts` 的 `SITE_URL`）。PWA 由 `vite-plugin-pwa` 预缓存，`registerType: "prompt"`，`navigateFallback: "/index.html"`（`/legal/` 在 denylist）。测试文件与源码同目录（`*.test.ts(x)`）加顶层 `tests/`（`.test.mjs` 构建产物校验）。

## 选型

Vite 8 + React 19 + TypeScript（`tsconfig.json`/`tsconfig.app.json`/`tsconfig.node.json`，路径别名 `@` → `src`）。Tailwind CSS 4（`@tailwindcss/vite`）+ shadcn/ui（new-york 风格，`components.json`，Radix primitives）。图标 lucide-react，toast sonner。PNG 压缩用 libimagequant-wasm + @jsquash/oxipng（WASM），Worker 由 esbuild 单独打包。包管理 pnpm（`pnpm@10.15.0`），Node `>=22.13.0`。

## 路由

无 Hash Route、无 SPA rewrite 依赖（每条路由有真实 HTML 文件）。客户端导航在 `src/lib/tool-navigation.ts`：`TOOL_PATHS` 定义 4 条路径，`readToolRoute()` 按 pathname 后缀判定当前路由，`navigateToTool()` 用 `history.pushState` + 派发 `popstate` 做无刷新切换（`OfflineToolsApp` 监听 `popstate` 重渲染）。Vite 构建入口在 `vite.config.ts` 的 `build.rollupOptions.input`（home/videoFrame/imageCompress/imageWatermark）。压缩↔水印间无刷新切换可保留已导入图片状态。`src/lib/seo.ts` 的 `SEO_PAGES` + `useRouteSeo()` 在路由切换时更新 title/description/canonical/OG/JSON-LD。

## 公共组件

`src/components/`：`tool-header`（顶部导航）、`tool-seo-content`（各工具页 SEO 文案）、`icp-footer`（固定底部 ICP 备案链接）、`pwa-status`（新版本提示）、`logo-mark`、`text-overlay-panel`（视频取帧文字叠加控制）。`src/components/ui/`（shadcn 生成）：`button`、`card`、`select`、`slider`、`sonner`。`src/lib/theme.tsx` 提供明暗主题 `ThemeProvider`。

## 图片压缩管线

PNG 压缩在独立 Web Worker `src/workers/image-compress-worker.ts` 中执行，由 `src/lib/png-compressor.ts` 的 `PngCompressor` 通过 `postMessage` 调度（Worker 加载自 `${BASE_URL}assets/image-compress-worker.js`）。管线：libimagequant 解码 PNG→RGBA → `src/lib/png-strategy.ts` 的 `analyzePngPixels`/`choosePngCompressionPlan` 决定 `lossless` 或 `quantized` → OxiPNG 无损优化，必要时 libimagequant 量化调色板后再 OxiPNG 优化，取最小者；策略标签 `original`/`oxipng`/`libimagequant-oxipng`。JPG/WebP 走 Canvas `toBlob`，且不生成比原图更大的文件（`ImageProcessor.compressAsset`）。Worker 由 `scripts/build-image-codecs.mjs` 用 esbuild 预构建到 `public/assets/image-compress-worker.js`（含 GPL 法律 banner，可复现构建见 `CORRESPONDING_SOURCE.md`），该产物已 gitignore；`pnpm dev`/`pnpm build` 前置自动运行 `build:image-codecs`。
