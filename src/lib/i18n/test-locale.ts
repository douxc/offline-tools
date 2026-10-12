import { createElement, type ReactElement, type ReactNode } from "react";
import { LocaleProvider } from "./locale-context";
import type { LocaleCode } from "./locales";

/**
 * 测试用：把组件放进指定语言的 `LocaleProvider`。
 *
 * 组件的 SSR 测试（`renderToString`，无 DOM、无 provider）默认渲染默认语言
 * （英语）。要断言某种语言的文案时必须显式包一层 provider —— 这正是
 * 「文案随语言变化」的验证方式。
 */
export const withLocale = (
  node: ReactNode,
  locale: LocaleCode,
): ReactElement =>
  // children 作为 createElement 的第三个参数传入，而不是塞进 props
  createElement(LocaleProvider, { initialLocale: locale }, node);
