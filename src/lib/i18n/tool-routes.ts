/**
 * 工具路由的**语言无关数据**：路由标识与裸路径。
 *
 * 从 `src/lib/tool-navigation.ts` 拆出，使构建期代码（`vite.config.ts` 经
 * `scripts/vite-plugin-i18n-entries.ts` → `entry-html.ts` → 本模块）不必触碰
 * DOM。`tool-navigation.ts` 还包含 `readToolRoute` 与 `navigateToTool`，它们使用
 * `window`/`PopStateEvent`，而构建期配置用的是 `tsconfig.node.json`（无 DOM lib），
 * 一旦被拉进构建期依赖图就会 `Cannot find name 'window'`。
 *
 * 本模块不得 import React 或浏览器全局。
 */

export type ToolRoute =
  | "home"
  | "video-frame"
  | "video-compress"
  | "image-compress"
  | "image-watermark"
  | "id-photo"
  | "image-a4-layout";

/** 各工具的裸路径（默认语言，无语言前缀）。 */
export const TOOL_PATHS: Record<ToolRoute, string> = {
  home: "/",
  "video-frame": "/video-frame/",
  "video-compress": "/video-compress/",
  "image-compress": "/image-compress/",
  "image-watermark": "/image-watermark/",
  "id-photo": "/id-photo/",
  "image-a4-layout": "/image-a4-layout/",
};

/** 全部工具路由，顺序即导航与列表顺序。 */
export const TOOL_ROUTES: readonly ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "id-photo",
  "image-a4-layout",
];
