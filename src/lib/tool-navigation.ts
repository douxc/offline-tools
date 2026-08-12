import type { MouseEvent } from "react";

export type ToolRoute =
  | "home"
  | "video-frame"
  | "video-compress"
  | "image-compress"
  | "image-watermark";

export const TOOL_PATHS: Record<ToolRoute, string> = {
  home: "/",
  "video-frame": "/video-frame/",
  "video-compress": "/video-compress/",
  "image-compress": "/image-compress/",
  "image-watermark": "/image-watermark/",
};

export const readToolRoute = (): ToolRoute => {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path.endsWith("/video-frame")) return "video-frame";
  if (path.endsWith("/video-compress")) return "video-compress";
  if (path.endsWith("/image-compress")) return "image-compress";
  if (path.endsWith("/image-watermark")) return "image-watermark";
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
