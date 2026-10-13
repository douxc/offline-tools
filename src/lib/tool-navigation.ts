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

/**
 * 站内无刷新导航。
 *
 * **导航目标取自锚点自身的 `href`，而不是重新拼一遍路径。**
 *
 * 这一点是本模块最容易出错的地方：链接的 `href` 由 `toolHref(locale, route)`
 * 生成（可能带 `/zh`、`/ja` 前缀），如果这里改用与语言无关的 `TOOL_PATHS[route]`
 * 去 `pushState`，就会**把用户从 `/ja/…` 打回英语页** —— 渲染出来的 href 是对的，
 * 只有点击后跳错，静态检查与「断言 href」类测试都发现不了。
 *
 * 以 `href` 为准使两者在构造上不可能不一致：页面显示哪个地址，`pushState`
 * 就写哪个地址。无 `href`（异常 DOM）时才回退到语言无关路径。
 */
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
  const href = event.currentTarget?.getAttribute?.("href");
  const nextPath = href && href.startsWith("/") ? href : TOOL_PATHS[route];
  if (window.location.pathname !== nextPath) {
    window.history.pushState({ tool: route }, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
};
