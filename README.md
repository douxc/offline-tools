# 帧切

完全运行在浏览器中的离线视频取帧工具。视频只通过本地 Blob URL 解码，
不会上传到服务器；当前帧可按原始分辨率导出为 PNG、JPG 或 WebP。

## 技术栈

- Vite 8 + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui（Radix primitives）
- vite-plugin-pwa + Workbox 离线预缓存
- Cloudflare Vite 静态资源发布适配器

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

- `dist/client/`：浏览器静态资源、manifest 和 Service Worker
- `dist/server/`：托管平台所需的静态资源适配器，不包含 SSR 或业务逻辑
- `dist/.openai/hosting.json`：现有 Sites 项目的发布元数据

PWA 首次加载完成后可以断网使用。发现新版本时只缓存并提示，关闭当前标签页
后再次打开才会启用新版，不会打断正在处理的视频。
