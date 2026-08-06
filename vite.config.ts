import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig({
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
        name: "帧切 · 离线视频取帧",
        short_name: "帧切",
        description: "视频不上传，在浏览器中精准选帧并导出图片。",
        lang: "zh-CN",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#111110",
        theme_color: "#111110",
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
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,png,svg,webp,ico}"],
      },
    }),
    sites(),
    cloudflare({
      viteEnvironment: { name: "server" },
      config: {
        main: "./worker/index.ts",
        compatibility_date: "2026-05-22",
        compatibility_flags: ["nodejs_compat"],
        assets: {
          binding: "ASSETS",
          not_found_handling: "single-page-application",
        },
        d1_databases: hostingConfig.d1
          ? [
              {
                binding: hostingConfig.d1,
                database_name: "framecut-d1",
                database_id: "00000000-0000-4000-8000-000000000000",
              },
            ]
          : [],
        r2_buckets: hostingConfig.r2
          ? [
              {
                binding: hostingConfig.r2,
                bucket_name: "framecut-r2",
              },
            ]
          : [],
      },
    }),
  ],
});
