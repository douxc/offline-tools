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

export type ResolveLocaleInput = {
  /** 当前地址的 pathname。 */
  readonly pathname: string;
};

/**
 * 解析当前语言：**有前缀取前缀语言，无前缀一律英语**。
 *
 * 规则统一到这一条，不再有「无前缀时让位给偏好」的特例：`/video-frame/` 与 `/`
 * 永远渲染英语，`/zh/…` 永远渲染中文，`/ja/…` 永远渲染日语。
 *
 * **为什么不再读偏好与 `navigator.language`**：
 *  - 站点产出 21 个独立规范 URL，sitemap 与 `hreflang` 都按「一个 URL 一种语言」
 *    声明。若同一个 URL 依访客本地状态返回不同语言，声明与实际就互相矛盾，
 *    搜索引擎收录的页面也可能与语言声明不符。
 *  - 路径是唯一权威后，服务端静态产物与客户端解析结果必然一致，不存在
 *    「先渲染一种语言、再由脚本改成另一种」的窗口。
 *
 * 因此语言偏好不再参与语言决定（`/openspec-update-change` 已把这条写回 spec）。
 * 偏好仅用于记住用户在切换器里的选择，供切换器显示与回访时提示。
 *
 * 本函数是纯函数：不读写存储、不触碰浏览器全局。
 */
export const resolveLocale = ({ pathname }: ResolveLocaleInput): LocaleCode =>
  localeForPrefix(prefixFromPathname(pathname)) ?? DEFAULT_LOCALE;

/**
 * 路径是否显式指定了语言。
 *
 * 与「是否带前缀」等价，因此也是**唯一需要写入偏好的时机**：显式路径代表用户
 * 明确选择了语言（外部直链即属此列）。无前缀路径不写偏好，避免默认语言把
 * 所有人的偏好刷成英语。
 */
export const localeExplicitInPath = (pathname: string): boolean =>
  localeForPrefix(prefixFromPathname(pathname)) !== null;
