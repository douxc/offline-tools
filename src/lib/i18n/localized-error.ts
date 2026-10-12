/**
 * 可从界面层翻译的错误。
 *
 * ## 为什么需要它
 *
 * `src/lib/` 下的纯函数与 worker 会抛出**面向用户**的错误（尺寸无效、无法解码、
 * PNG 超时…），但它们没有 React 上下文，`useT()` 无从取得；worker 更是另一个
 * 线程，连 DOM 都没有。此前这些消息是硬编码中文，导致非中文界面会出现中文报错。
 *
 * 做法：纯函数/worker 抛出**错误码**（一个词条键），界面层捕获后用 `useT()`
 * 翻译。好处是：
 *  - 纯函数保持纯粹（不依赖 React、不依赖语言）；
 *  - 跨线程可行：worker 回传 `postMessage` 时只带码，主线程翻译；
 *  - 翻译结果随当前语言，且与界面其余文案同源。
 *
 * 这是纯函数对外契约的一部分（抛什么），因此 `code` 是稳定标识，不随文案改。
 */
import type { MessageKey } from "./message-keys";

/**
 * 纯函数层可抛出的、需要界面翻译的错误码。
 *
 * 覆盖两类键：`err.*`（底层库/worker 的通用错误）与 `img.err*`（图片工具内部
 * 模块的错误）。两者都是「抛给界面翻译」的码，因此共用同一个类型约束 ——
 * 写错键名会在编译期被挡住。
 */
export type LocalizedErrorCode = Extract<
  MessageKey,
  `err.${string}` | `img.err${string}`
>;

/**
 * 带错误码的异常。界面层用 `translateError(t, error)` 转成当前语言的文案。
 */
export class LocalizedError extends Error {
  readonly code: LocalizedErrorCode;

  constructor(code: LocalizedErrorCode) {
    // message 保留为码本身：未翻译时日志里也能看出是哪一种错误，
    // 且不会把某种语言的文案泄漏进非界面路径。
    super(code);
    this.name = "LocalizedError";
    this.code = code;
  }
}

export const isLocalizedError = (value: unknown): value is LocalizedError =>
  value instanceof LocalizedError;

/** 词条查找函数的形状（与 `useT()` 返回一致，避免依赖 React 类型）。 */
export type Translate = (key: MessageKey) => string;

/**
 * 把任意异常转成当前语言的文案。
 *
 * - `LocalizedError` → 查词条；
 * - 其他 `Error` → 原样返回其 message（多为开发者错误，不该被吞掉）；
 * - 非 Error → 回退为空串（调用方通常有兜底文案）。
 */
export const translateError = (
  t: Translate,
  error: unknown,
): string => {
  if (isLocalizedError(error)) {
    return t(error.code);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "";
};
