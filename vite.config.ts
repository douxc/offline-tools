import path from "node:path";
import { readFile, readdir, writeFile } from "node:fs/promises";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { ANALYTICS_ID_TOKEN, resolveAnalyticsId } from "./src/lib/analytics";
import { SITE_URL, SITE_URL_TOKEN } from "./src/lib/site";

/**
 * 解析本次构建使用的站点绝对 URL：环境变量 `VITE_SITE_URL` 优先，否则回退到
 * `src/lib/site.ts` 的内置默认值，使没有任何环境变量配置的构建环境（例如
 * EdgeOne 云端构建）也能产出正确的绝对 URL。
 */
export const resolveSiteUrl = (): string => {
  const override = process.env.VITE_SITE_URL?.trim();
  const value = (override || SITE_URL).replace(/\/+$/, "");
  if (!/^https?:\/\/[^/\s]+$/.test(value)) {
    throw new Error(
      `站点 URL 必须是无尾斜杠的绝对地址（协议 + host），当前为 "${value}"`,
    );
  }
  return value;
};

export const siteUrl = resolveSiteUrl();

/**
 * 解析本次构建使用的统计站点标识：环境变量 `VITE_ANALYTICS_ID` 优先（空值显式
 * 关闭统计），否则回退到 `src/lib/analytics.ts` 的内置默认值。校验只允许十六进制
 * 标识，避免把非标识内容注入 HTML。
 */
export const buildAnalyticsId = (): string => {
  const value = resolveAnalyticsId(process.env.VITE_ANALYTICS_ID);
  if (value !== "" && !/^[0-9a-f]{16,64}$/i.test(value)) {
    throw new Error(
      `统计站点标识必须为空（关闭统计）或 16–64 位十六进制字符串，当前为 "${value}"`,
    );
  }
  return value;
};

export const analyticsId = buildAnalyticsId();

/** 构建期占位符 -> 最终值。数组顺序即替换顺序。 */
const INJECTIONS: ReadonlyArray<readonly [string, string]> = [
  [SITE_URL_TOKEN, siteUrl],
  [ANALYTICS_ID_TOKEN, analyticsId],
];

const applyInjections = (text: string): string =>
  INJECTIONS.reduce(
    (result, [token, value]) => result.replaceAll(token, value),
    text,
  );

/** 由 transformIndexHtml 负责的产物：closeBundle 对它们只剩兜底作用。 */
const PRIMARY_INJECTION_TARGETS = /(^|\/)index\.html$/;

/** 逐字节判断文件是否含占位符，缺失时不改写，保证重复构建幂等。 */
const replaceTokenInFile = async (file: string): Promise<boolean> => {
  const content = await readFile(file, "utf8").catch(() => null);
  if (content === null || !INJECTIONS.some(([token]) => content.includes(token))) {
    return false;
  }
  await writeFile(file, applyInjections(content));
  return true;
};

/**
 * 站点元信息注入插件（站点 URL 与统计站点标识）。
 *
 * 分两层，且位于 `plugins` 数组中 `VitePWA(...)` 之前 —— `closeBundle` 是顺序
 * 钩子，按插件数组顺序执行；只有先替换 `public/` 复制而来的 robots.txt 与
 * sitemap 相关的产物，`vite-plugin-pwa` 之后计算出的预缓存内容修订号才与产物
 * 一致（由 tests/site-url-embed.test.mjs 的修订号一致性断言守住）。
 *
 * 1. transformIndexHtml：在构建管线内为 HTML 入口注入站点 URL 与统计标识，使
 *    生成的 HTML 直接携带最终值 —— 这是 HTML 的主机制。
 * 2. closeBundle：遍历产物目录替换残留占位符。它负责 `public/` 复制而来的
 *    sitemap.xml 与 robots.txt（它们不经过 HTML 管线），同时兜住第 1 层未覆盖
 *    的入口。
 *
 * 若第 1 层因故未生效，兜底层会掩盖症状，因此这里对「本应由第 1 层处理的产物
 * 仍带占位符」给出显式告警，使机制退化可观测。
 */
const siteMetaPlugin = (): Plugin => ({
  name: "offline-tools:site-meta",
  enforce: "pre",
  transformIndexHtml: {
    order: "post",
    handler: (html) => applyInjections(html),
  },
  async closeBundle() {
    const walk = async (dir: string): Promise<string[]> => {
      const entries = await readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map((entry) => {
          const full = path.join(dir, entry.name);
          return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
        }),
      );
      return files.flat();
    };
    const outputFiles = await walk("dist");
    const injected = await Promise.all(
      outputFiles
        .filter((file) => /\.(html|xml|txt|json|webmanifest)$/.test(file))
        .map(async (file) => [file, await replaceTokenInFile(file)] as const),
    );
    const missedPrimary = injected
      .filter(
        ([file, replaced]) =>
          replaced && PRIMARY_INJECTION_TARGETS.test(file.replace(/\\/g, "/")),
      )
      .map(([file]) => file);
    if (missedPrimary.length > 0) {
      this.warn(
        `以下入口未由 transformIndexHtml 注入，已由 closeBundle 兜底：` +
          `${missedPrimary.join(", ")}。请检查站点元信息插件在 plugins 中的位置与钩子名。`,
      );
    }
  },
});

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
        imageA4Layout: path.resolve(
          import.meta.dirname,
          "image-a4-layout/index.html",
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
    siteMetaPlugin(),
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
