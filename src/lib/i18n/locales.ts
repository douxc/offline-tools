/**
 * 站点语言的权威数据（单一来源）。
 *
 * 这里是「站点支持哪些语言」的唯一决定处：路径前缀、HTML/OG/hreflang 标签写法
 * 都从这里取值。`vite.config.ts` 在构建期直接 import 本模块来生成 21 个入口页，
 * 因此本模块**不得 import React，也不得触碰任何浏览器全局**（window/document/
 * navigator/localStorage）—— 那会让构建期加载失败。由 locales.test.ts 守卫。
 */

export type LocaleCode = "en" | "zh-CN" | "ja";

/** 语言路径前缀：英语为空字符串（占据根路径）。 */
export type LocalePrefix = "" | "/zh" | "/ja";

export type Locale = {
  /** BCP 47 标签，同时用作词条文件名与 HTML `lang` 取值。 */
  readonly code: LocaleCode;
  /** 路径前缀；空字符串表示根路径。 */
  readonly prefix: LocalePrefix;
  /** 语言切换器中显示的名称（用该语言自身书写，避免用户看不懂）。 */
  readonly displayName: string;
  /** `<html lang>` 取值。 */
  readonly htmlLang: string;
  /** Open Graph `og:locale` 取值（下划线形式）。 */
  readonly ogLocale: string;
  /** `hreflang` 取值。 */
  readonly hreflang: string;
};

/**
 * 三种语言的完整定义。英语是默认语言并占据根路径，因此它的 prefix 为空串；
 * 新增语言时只需在此追加一项，入口页生成、hreflang、sitemap 与测试断言都会跟随。
 */
export const LOCALES: Record<LocaleCode, Locale> = {
  en: {
    code: "en",
    prefix: "",
    displayName: "English",
    htmlLang: "en",
    ogLocale: "en_US",
    hreflang: "en",
  },
  "zh-CN": {
    code: "zh-CN",
    prefix: "/zh",
    displayName: "简体中文",
    htmlLang: "zh-CN",
    ogLocale: "zh_CN",
    hreflang: "zh-CN",
  },
  ja: {
    code: "ja",
    prefix: "/ja",
    displayName: "日本語",
    htmlLang: "ja",
    ogLocale: "ja_JP",
    hreflang: "ja",
  },
};

/** 默认语言：无任何来源可用时使用，且占据根路径。 */
export const DEFAULT_LOCALE: LocaleCode = "en";

/** 全部语言码，顺序即语言切换器的展示顺序（默认语言在前）。 */
export const LOCALE_CODES: readonly LocaleCode[] = [
  DEFAULT_LOCALE,
  ...(Object.keys(LOCALES) as LocaleCode[]).filter(
    (code) => code !== DEFAULT_LOCALE,
  ),
];

/** 语言偏好的本地存储键；`offline-tools-` 前缀与主题键保持一致。 */
export const LOCALE_STORAGE_KEY = "offline-tools-locale";

export const isLocaleCode = (value: unknown): value is LocaleCode =>
  typeof value === "string" && Object.hasOwn(LOCALES, value);

/**
 * 按路径前缀查语言。前缀必须**整段**匹配，因此 `/fr/video-frame/` 与
 * 形似前缀的 `/zhx` 都不会被误判成语言。
 *
 * 空串**不**匹配任何语言：英语的 prefix 是 `""`，但「路径里没有前缀」不等于
 * 「路径明确指定了英语」。这条区分决定了访问 `/` 时已保存偏好是否生效 ——
 * 若空串命中英语，则 `/` 会被当成显式语言指定，偏好永远无法生效，
 * 「切换到日语后重新打开站点仍是日语」随之失效。
 */
export const localeForPrefix = (prefix: string): LocaleCode | null => {
  if (prefix === "") return null;
  for (const code of LOCALE_CODES) {
    if (LOCALES[code].prefix === prefix) return code;
  }
  return null;
};

/**
 * 取出 pathname 的语言前缀段（可能是空串）。只取**第一段**并整段比对，
 * 因此 `/zhx/video-frame/` 得到 `/zhx`，不会命中 `/zh`。
 */
const prefixFromPathname = (pathname: string): string => {
  const withoutLeadingSlash = pathname.replace(/^\/+/, "");
  if (withoutLeadingSlash === "") return "";
  const [firstSegment] = withoutLeadingSlash.split("/");
  return firstSegment === "" ? "" : `/${firstSegment}`;
};

/**
 * navigator.language 的**主语言子标签**到站点语言的映射。
 *
 * 故意不区分 `zh-Hans`/`zh-Hant` 之外的地区变体：站点只有一种中文，
 * 因此 `zh` 开头且非繁体取向的一律落到 `zh-CN`。
 */
const PRIMARY_LANGUAGE: Record<string, LocaleCode | undefined> = {
  en: "en",
  zh: "zh-CN",
  ja: "ja",
};

const localeForNavigatorLanguage = (language: string): LocaleCode | null => {
  const [primary] = language.toLowerCase().split("-");
  return PRIMARY_LANGUAGE[primary] ?? null;
};

export type ResolveLocaleInput = {
  /** 当前地址的 pathname。 */
  readonly pathname: string;
  /** 已保存的语言偏好（未保存时传 null）。 */
  readonly stored?: string | null;
  /** `navigator.language`；不可用时传空串或省略。 */
  readonly navigatorLanguage?: string | null;
};

/**
 * 按固定优先级解析当前语言：**路径前缀 > 已保存偏好 > navigator.language > 英语**。
 *
 * 路径前缀属于「URL 明确指定」，因此压过历史偏好 —— 外部站点直链
 * `/zh/video-frame/` 时，接收者既有的偏好不得把页面改回其他语言。
 * 本函数是纯函数，不读写存储、不触碰浏览器全局。
 */
export const resolveLocale = ({
  pathname,
  stored,
  navigatorLanguage,
}: ResolveLocaleInput): LocaleCode => {
  const fromPath = localeForPrefix(prefixFromPathname(pathname));
  if (fromPath) return fromPath;

  if (isLocaleCode(stored)) return stored;

  const fromNavigator = localeForNavigatorLanguage(navigatorLanguage ?? "");
  if (fromNavigator) return fromNavigator;

  return DEFAULT_LOCALE;
};

/** 路径是否显式指定了语言（用于判断「是否需要把偏好更新为路径语言」）。 */
export const localeExplicitInPath = (pathname: string): boolean =>
  localeForPrefix(prefixFromPathname(pathname)) !== null;
