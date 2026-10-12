import type { MouseEvent } from "react";
import { LOCALE_CODES, LOCALES } from "./i18n/locales";
import { TOOL_PATHS, type ToolRoute } from "./i18n/tool-routes";

// 路由数据已拆到 ./i18n/tool-routes（构建期也要用，且那边不碰 DOM）。
// 这里继续对外导出，避免既有调用点全部改 import。
export { TOOL_PATHS, TOOL_ROUTES, type ToolRoute } from "./i18n/tool-routes";

/**
 * 一级分组：每个分组覆盖一组工具路由，点击分组跳到该组默认工具。
 *
 * 这里只保留**与语言无关**的结构（默认工具与成员路由）；显示名在词条里
 * （`group.video` / `group.image`，见 `label-keys.ts` 的 `groupLabelKey`），
 * 因此新增语言不需要改本文件。
 */
export const TOOL_GROUPS = {
  video: {
    default: "video-frame",
    routes: ["video-frame", "video-compress"],
  },
  image: {
    default: "image-compress",
    routes: ["image-compress", "image-watermark", "id-photo", "image-a4-layout"],
  },
} as const satisfies Record<
  string,
  { default: ToolRoute; routes: readonly ToolRoute[] }
>;

export type ToolGroup = keyof typeof TOOL_GROUPS;

/** 返回路由所属分组；首页不属于任何分组。 */
export const toolGroupForRoute = (route: ToolRoute): ToolGroup | null => {
  for (const group of Object.keys(TOOL_GROUPS) as ToolGroup[]) {
    if ((TOOL_GROUPS[group].routes as readonly ToolRoute[]).includes(route)) {
      return group;
    }
  }
  return null;
};

/**
 * 由 pathname 判定当前工具路由。
 *
 * 先剥除**已支持的语言前缀**（`/zh`、`/ja`），再按工具段判定，因此
 * `/ja/video-frame/`、`/zh/id-photo/` 与无前缀路径得到同一路由。页头一级分组
 * 的高亮依赖这一结果，所以任一语言下的分组高亮都正确。
 *
 * 只剥除已支持的前缀：`/fr/video-frame/` 不会被当作「法语前缀」而改变判定逻辑。
 *
 * `pathname` 可注入，使该判定无需浏览器环境即可穷举测试。
 */
export const stripLocalePrefix = (pathname: string): string => {
  for (const code of LOCALE_CODES) {
    const { prefix } = LOCALES[code];
    if (prefix === "") continue;
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length);
    }
  }
  return pathname;
};

export const readToolRoute = (pathname?: string): ToolRoute => {
  const raw =
    pathname ??
    (typeof window === "undefined" ? "/" : window.location.pathname);
  const path = stripLocalePrefix(raw).replace(/\/+$/, "") || "/";
  if (path.endsWith("/video-frame")) return "video-frame";
  if (path.endsWith("/video-compress")) return "video-compress";
  if (path.endsWith("/image-compress")) return "image-compress";
  if (path.endsWith("/image-watermark")) return "image-watermark";
  if (path.endsWith("/id-photo")) return "id-photo";
  if (path.endsWith("/image-a4-layout")) return "image-a4-layout";
  return "home";
};

export const navigateToTool = (
  event: MouseEvent<HTMLAnchorElement>,
  route: ToolRoute,
) => {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  const nextPath = TOOL_PATHS[route];
  if (window.location.pathname !== nextPath) {
    window.history.pushState({ tool: route }, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};
