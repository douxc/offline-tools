/**
 * 词条表的按语言索引。
 *
 * 三份词条都以 `satisfies Messages` 约束，因此**缺键会在类型检查阶段报错**，
 * 不需要等到运行时才发现某个语言少了一条文案。
 */
import type { LocaleCode } from "../locales";
import type { Messages } from "../message-keys";
import { en } from "./en";
import { ja } from "./ja";
import { zhCN } from "./zh-CN";

export const MESSAGES: Record<LocaleCode, Messages> = {
  en,
  "zh-CN": zhCN,
  ja,
};

export const messagesFor = (locale: LocaleCode): Messages => MESSAGES[locale];

export { en, ja, zhCN };
