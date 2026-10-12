/**
 * 语言切换的**纯逻辑**：给定「当前路径 + 目标语言」，算出该跳到哪个规范路径。
 *
 * 抽出来是为了可测：组件里的 `window.location.assign` 无法在 SSR 测试中驱动，
 * 而「切换语言要保持当前工具」这条 spec 要求必须被穷举验证（7 个工具 × 3 种目标
 * 语言）。这里不触碰任何浏览器全局。
 */
import { LOCALE_CODES, type LocaleCode } from "./locales";
import { toolHref } from "./routes";
import type { ToolRoute } from "./tool-routes";
import { readToolRoute, stripLocalePrefix } from "../tool-navigation";

/** 全部工具路由，供穷举测试使用。 */
export const SWITCHABLE_ROUTES: readonly ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "id-photo",
  "image-a4-layout",
];

/** 全部支持语言，供 UI 遍历与测试穷举。 */
export const SWITCHABLE_LOCALES: readonly LocaleCode[] = LOCALE_CODES;

/**
 * 由当前 pathname 与目标语言算出切换后的规范路径。
 *
 * 关键点：先剥除**当前**语言前缀再交由 `toolHref` 加**目标**语言前缀，
 * 因此 `/ja/video-compress/` 切到英语得到 `/video-compress/`（而不是
 * `/ja/video-compress/` 或 `/en/...`），工具路径本身不变。
 */
export const languageSwitchPath = (
  pathname: string,
  next: LocaleCode,
): string => {
  const route = readToolRoute(stripLocalePrefix(pathname));
  return toolHref(next, route);
};
