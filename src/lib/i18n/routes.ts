/**
 * 语言化路径的**唯一构造入口**。
 *
 * 全站任何需要「指向某个工具」的地方（页头一级分组、二级 tab、相关工具链接、
 * 品牌回首页、canonical、hreflang、sitemap）都必须经由此模块，而不是直接拼
 * 裸路径 —— 直接拼 `/video-frame/` 会在中文/日语下把用户打回英语。
 *
 * 本模块与 `locales.ts` 一样**不得 import React 或浏览器全局**：`vite.config.ts`
 * 在构建期用它生成 21 个入口页与 sitemap。
 */
import {
  DEFAULT_LOCALE,
  LOCALES,
  type LocaleCode,
} from "./locales";
import { TOOL_PATHS, type ToolRoute } from "./tool-routes";

/**
 * 「语言 + 工具」的规范路径。
 *
 * 英语（默认语言）无前缀；其他语言在工具路径前加语言前缀。首页在所有语言下
 * 都带尾部斜杠：`/`、`/zh/`、`/ja/`。
 */
export const toolPathInLocale = (
  locale: LocaleCode,
  route: ToolRoute,
): string => {
  const { prefix } = LOCALES[locale];
  const bare = TOOL_PATHS[route];
  if (bare === "/") return `${prefix}/`;
  return `${prefix}${bare}`;
};

/** 上式的可读别名，供链接渲染处使用（语义等价）。 */
export const toolHref = toolPathInLocale;

/** 默认语言下的首页路径，即 `x-default` 与站点根。 */
export const DEFAULT_HOME_PATH = toolPathInLocale(DEFAULT_LOCALE, "home");

/** 全部语言的路径前缀（含英语的空串），供前缀遍历处使用。 */
export const LOCALE_PREFIXES: readonly string[] = Object.values(LOCALES).map(
  ({ prefix }) => prefix,
);
