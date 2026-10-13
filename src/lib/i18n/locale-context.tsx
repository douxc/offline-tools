/**
 * 语言上下文与词条查找（`useT`）。
 *
 * 与 `theme.tsx` 同样的形态：React context + 首帧前读一次本地存储。不做语言
 * 懒加载 —— 站点是离线 PWA，三份词条必须全量在包内，否则离线时切语言会失败。
 *
 * 语言解析本身是纯函数（`locales.ts` 的 `resolveLocale`），这里只负责：
 *  1. 按「路径 > 已保存偏好 > navigator > 英语」解析出当前语言；
 *  2. 在**路径显式指定语言**时把偏好更新为该语言（用户选了链接即选了语言）；
 *  3. 提供 `t(key, ...args)` 与 `setLocale`。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  localeExplicitInPath,
  resolveLocale,
  type LocaleCode,
} from "./locales";
import { messagesFor } from "./messages";
import type { MessageKey, MessageDefinition } from "./message-keys";

/**
 * 最小存储接口。抽出来是为了**可测**：注入一个假存储就能验证「何时写偏好、
 * 写入什么」，无需 DOM，也无需真的碰 localStorage。
 */
export type LocaleStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** 读取已保存的语言偏好；存储不可用（隐私模式）时返回 null。 */
export const readStoredLocale = (
  storage: LocaleStorage | null = defaultStorage(),
): string | null => {
  try {
    return storage?.getItem(LOCALE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

/** 写入语言偏好；失败不抛错（存储被禁用时静默降级）。 */
export const writeStoredLocale = (
  locale: LocaleCode,
  storage: LocaleStorage | null = defaultStorage(),
): void => {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 偏好保存失败不影响当前会话的语言
  }
};

/** 浏览器存储；SSR（无 window）时返回 null。 */
function defaultStorage(): LocaleStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 依据当前 URL 与偏好解析语言，并把「路径显式指定」同步进偏好。
 *
 * 写入规则（对应 i18n spec 的「语言偏好的保存」）：
 *  - **路径显式带语言前缀** → 用户通过链接明确选择了语言，写入偏好；
 *  - **无前缀路径**（如 `/`）→ 不写。否则默认语言会把所有人的偏好刷成英语，
 *    「以已保存偏好渲染 `/`」这条要求就永远无法成立。
 */
export const resolveInitialLocale = (
  pathname: string,
  storage: LocaleStorage | null = defaultStorage(),
): LocaleCode => {
  const resolved = resolveLocale({ pathname });
  // 只有显式带前缀的路径才写偏好：那代表用户明确选择了语言。
  // 无前缀路径永远英语，写偏好会把所有人的偏好刷成英语。
  if (localeExplicitInPath(pathname)) writeStoredLocale(resolved, storage);
  return resolved;
};

export type LocaleContextValue = {
  locale: LocaleCode;
  /** 词条查找：`t("tool.video-frame")` 或 `t("tabs.label", groupLabel)`。 */
  t: <Key extends MessageKey>(
    key: Key,
    ...args: MessageDefinition[Key] extends (...a: infer A) => string ? A : []
  ) => string;
  /** 切换语言（整页导航由调用方负责，这里只负责记录偏好）。 */
  setLocale: (locale: LocaleCode) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export type LocaleProviderProps = {
  /**
   * 可选：`createElement(LocaleProvider, props, child)` 会把 children 作为
   * 第三个参数传入，而不是放进 props（`react/no-children-prop` 要求如此）。
   */
  children?: ReactNode;
  /** 测试注入：覆盖初始语言解析。 */
  initialLocale?: LocaleCode;
};

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (initialLocale) return initialLocale;
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    return resolveInitialLocale(window.location.pathname);
  });

  // 浏览器前进/后退可能落在另一种语言的路径上，需同步语言
  useEffect(() => {
    const onPopState = () => {
      setLocaleState(resolveInitialLocale(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    writeStoredLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const messages = messagesFor(locale) as Record<string, unknown>;
    const t = (key: MessageKey, ...args: unknown[]): string => {
      const entry = messages[key];
      if (typeof entry === "function") {
        return (entry as (...a: unknown[]) => string)(...args);
      }
      if (typeof entry === "string") return entry;
      // 键缺失由类型系统挡住；运行期兜底成键名，便于在界面上直接看出漏翻
      return String(key);
    };
    return { locale, t: t as LocaleContextValue["t"], setLocale };
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/**
 * 无 provider 时使用的兜底：默认语言的词条。
 *
 * 刻意**不抛错**。两个理由：
 *  1. 组件的 SSR 测试用 `renderToString` 且没有 DOM（项目未装 jsdom），无法真正
 *     挂载 provider；抛错会让这类测试全部失效。
 *  2. 缺 provider 时退回默认语言是可预期的降级 —— 站点默认语言就是英语，
 *     渲染出英语比渲染出空白或崩溃更接近正确行为。
 * 需要非默认语言时显式包 `LocaleProvider`（测试用 `withLocale`）。
 */
const fallbackValue = (locale: LocaleCode): LocaleContextValue => {
  const messages = messagesFor(locale) as Record<string, unknown>;
  const t = (key: MessageKey, ...args: unknown[]): string => {
    const entry = messages[key];
    if (typeof entry === "function") {
      return (entry as (...a: unknown[]) => string)(...args);
    }
    return typeof entry === "string" ? entry : String(key);
  };
  return {
    locale,
    t: t as LocaleContextValue["t"],
    setLocale: () => {
      // 无 provider 时切换语言无意义：调用方应改用整页导航
    },
  };
};

/** 取词条查找函数；无 provider 时退回默认语言词条。 */
export const useT = (): LocaleContextValue["t"] =>
  useContext(LocaleContext)?.t ?? fallbackValue(DEFAULT_LOCALE).t;

/** 取当前语言与切换函数；无 provider 时退回默认语言。 */
export const useLocale = (): LocaleContextValue =>
  useContext(LocaleContext) ?? fallbackValue(DEFAULT_LOCALE);
