# 离线工具

完全运行在浏览器中的视频与图片处理工具。文件只通过本地 Blob URL 解码，
不会上传到服务器。

- 视频取帧：逐帧选择并按原始分辨率导出 PNG、JPG 或 WebP。
- 图片压缩：PNG 使用 libimagequant 与 OxiPNG，JPG/WebP 使用浏览器编码器。
- 图片水印：批量添加文字水印，保持原始尺寸与图片格式。
- 图片 A4 排版：只设每行张数，图片按各自宽高比流动排到 A4 纸上，直接调用浏览器打印。

## 访问统计

生产站点使用百度统计统计页面访问与工具使用情况（哪个工具被真正用完），
统计只上报页面路径与固定的工具事件（数量、格式、成功/失败/取消），
**不采集文件内容、文件名，也不写入浏览器存储**。统计脚本只在生产构建且浏览器
在线时加载，本地开发与离线使用都不产生统计请求，也不进入 PWA 预缓存。
实现与事件口径见 `src/lib/analytics.ts`，接入边界见
`openspec/specs/analytics/spec.md`。

## 静态页面

构建会为每个工具生成独立 HTML 入口，不使用 Hash Route，也不要求静态服务器
配置 SPA rewrite：

- `/`：工具索引
- `/video-frame/`：视频取帧
- `/video-compress/`：视频压缩
- `/image-compress/`：图片压缩
- `/image-watermark/`：图片添加水印
- `/image-a4-layout/`：图片 A4 排版打印

每个页面包含独立标题、描述、canonical、Open Graph 和 JSON-LD。顶部导航为
一级分组（视频/图片），各工具页提供对应分组的二级工具 tab（shadcn Tabs，
`src/components/tool-tabs.tsx`）。图片压缩、水印与 A4 排版页面之间使用
History API 无刷新切换，因此不会清空已导入的图片。

## 技术栈

- Vite 8 + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui（Radix primitives：button/card/select/slider/tabs/popover）
- vite-plugin-pwa + Workbox 离线预缓存
- Web Worker + libimagequant WASM + OxiPNG WASM

## 开发

需要 Node.js `>=22.13.0` 和 pnpm `>=10`。

```bash
pnpm install
pnpm dev
pnpm test
```

无障碍验收口径：交互控件的状态语义（`aria-pressed`/`aria-current`/tab 语义/弹层触发属性）
由代码与自动化测试覆盖（`src/**/*.test.*`、`tests/*.mjs`），不做真机 TalkBack 测试。

## 构建产物

```bash
pnpm build
```

`dist/` 中只包含可部署到任意静态文件服务器的浏览器资源、manifest 和
Service Worker。项目不包含自动上传或发布脚本；`pnpm build` 只会写入本地
`dist/` 目录。

PWA 首次加载完成后可以断网使用。发现新版本时只缓存并提示，关闭当前标签页
后再次打开才会启用新版，不会打断正在处理的视频。

## License

本项目及其组合浏览器发行版采用 GPL-3.0-or-later。完整条款见
[`LICENSE`](LICENSE)，第三方组件见
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)，压缩 Worker 的可复现
构建说明见 [`CORRESPONDING_SOURCE.md`](CORRESPONDING_SOURCE.md)。
