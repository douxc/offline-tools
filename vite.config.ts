import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: path.resolve(import.meta.dirname, "index.html"),
        videoFrame: path.resolve(
          import.meta.dirname,
          "video-frame/index.html",
        ),
        videoCompress: path.resolve(
          import.meta.dirname,
          "video-compress/index.html",
        ),
        imageCompress: path.resolve(
          import.meta.dirname,
          "image-compress/index.html",
        ),
        imageWatermark: path.resolve(
          import.meta.dirname,
          "image-watermark/index.html",
        ),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      manifest: {
        name: "离线工具 · 视频取帧与图片处理",
        short_name: "离线工具",
        description: "视频与图片不上传，在浏览器中完成取帧、压缩和水印。",
        lang: "zh-CN",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/legal\//],
        globPatterns: ["**/*.{js,css,html,png,svg,webp,ico,md,txt}"],
      },
    }),
  ],
});
