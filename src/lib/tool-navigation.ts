import type { MouseEvent } from "react";

export type ToolRoute =
  | "home"
  | "video-frame"
  | "video-compress"
  | "image-compress"
  | "image-watermark"
  | "image-a4-layout";

export const TOOL_PATHS: Record<ToolRoute, string> = {
  home: "/",
  "video-frame": "/video-frame/",
  "video-compress": "/video-compress/",
  "image-compress": "/image-compress/",
  "image-watermark": "/image-watermark/",
  "image-a4-layout": "/image-a4-layout/",
};

/** 工具显示名（导航、tab、相关链接共用，单一来源）。 */
export const TOOL_LABELS: Record<ToolRoute, string> = {
  home: "离线工具",
  "video-frame": "视频取帧",
  "video-compress": "视频压缩",
  "image-compress": "图片压缩",
  "image-watermark": "添加水印",
  "image-a4-layout": "A4 排版",
};

/** 一级分组：每个分组覆盖一组工具路由，点击分组跳到该组默认工具。 */
export const TOOL_GROUPS = {
  video: {
    label: "视频",
    default: "video-frame",
    routes: ["video-frame", "video-compress"],
  },
  image: {
    label: "图片",
    default: "image-compress",
    routes: ["image-compress", "image-watermark", "image-a4-layout"],
  },
} as const satisfies Record<
  string,
  { label: string; default: ToolRoute; routes: readonly ToolRoute[] }
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

export const readToolRoute = (): ToolRoute => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path.endsWith("/video-frame")) return "video-frame";
  if (path.endsWith("/video-compress")) return "video-compress";
  if (path.endsWith("/image-compress")) return "image-compress";
  if (path.endsWith("/image-watermark")) return "image-watermark";
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
