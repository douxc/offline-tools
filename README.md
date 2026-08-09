# 离线工具

完全运行在浏览器中的视频与图片处理工具。文件只通过本地 Blob URL 解码，
不会上传到服务器。

- 视频取帧：逐帧选择并按原始分辨率导出 PNG、JPG 或 WebP。
- 图片压缩：PNG 使用 libimagequant 与 OxiPNG，JPG/WebP 使用浏览器编码器。
- 图片水印：批量添加文字水印，保持原始尺寸与图片格式。

## 静态页面

构建会为每个工具生成独立 HTML 入口，不使用 Hash Route，也不要求静态服务器
配置 SPA rewrite：

- `/`：工具索引
- `/video-frame/`：视频取帧
- `/image-compress/`：图片压缩
- `/image-watermark/`：图片添加水印

每个页面包含独立标题、描述、canonical、Open Graph 和 JSON-LD。图片压缩与
水印页面之间使用 History API 无刷新切换，因此不会清空已导入的图片。

## 技术栈

- Vite 8 + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui（Radix primitives）
- vite-plugin-pwa + Workbox 离线预缓存
- Web Worker + libimagequant WASM + OxiPNG WASM

## 开发

需要 Node.js `>=22.13.0` 和 pnpm `>=10`。

```bash
pnpm install
pnpm dev
pnpm test
```

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
