/**
 * `hreflang` 互指集合的**唯一生成处**。
 *
 * 每页的 `<link rel="alternate">` 与 `sitemap.xml` 的 `xhtml:link` 都从这里取值，
 * 因此两处的互指关系不可能不一致（`site-url` spec 要求互指闭合）。
 *
 * 与 `locales.ts`、`routes.ts` 一样不得 import React 或浏览器全局：
 * `vite.config.ts` 在构建期用它渲染入口页与 sitemap。
 */
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, type LocaleCode } from "./locales";
import { DEFAULT_HOME_PATH, toolPathInLocale } from "./routes";
import type { ToolRoute } from "./tool-routes";

export type HreflangEntry = {
  /** `hreflang` 取值；`x-default` 见 `isDefault`。 */
  hreflang: string;
  path: string;
  locale: LocaleCode | null;
  isDefault: boolean;
};

/**
 * 返回该工具全部语言版本 + `x-default` 的互指集合。
 *
 * `x-default` 指向默认语言（英语）的根路径，与解析兜底保持一致。
 * 传入的 `locale` 只决定顺序（当前语言在前无实际意义，此处保持语言集合顺序）。
 */
export const listHreflang = (
  _locale: LocaleCode,
  route: ToolRoute,
): readonly HreflangEntry[] => [
  ...LOCALE_CODES.map((code) => ({
    hreflang: LOCALES[code].hreflang,
    path: toolPathInLocale(code, route),
    locale: code,
    isDefault: false,
  })),
  {
    hreflang: "x-default",
    path: toolPathInLocale(DEFAULT_LOCALE, route),
    locale: null,
    isDefault: true,
  },
];

/** `x-default` 的站点级路径（首页），供 sitemap 的顶层条目使用。 */
export const defaultHomePath = DEFAULT_HOME_PATH;
