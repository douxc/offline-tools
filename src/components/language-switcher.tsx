import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { LOCALES, LOCALE_CODES, type LocaleCode } from "@/lib/i18n/locales";
import { useLocale } from "@/lib/i18n/locale-context";
import { languageSwitchPath } from "@/lib/i18n/switch-locale";

/**
 * 页头语言切换器。
 *
 * 三条设计约束来自 `i18n` spec：
 *  1. **列出全部支持语言并标明当前语言** —— 用 shadcn `Select`，当前项是它的值；
 *  2. **切换语言保持当前工具** —— 目标路径由 `toolHref(目标语言, 当前工具)` 得出，
 *     而不是回到首页；
 *  3. **可被辅助技术识别、焦点可见** —— Select 自带 listbox 语义与键盘操作
 *     （方向键 + 回车），触发器的 `aria-label` 来自词条。
 *
 * 切换采用**整页导航**（`location.assign`）而不是 `pushState`：语言变化会连带改变
 * `<html lang>`、`canonical`、`hreflang`、JSON-LD 与全部正文，这些都在静态 HTML 里，
 * 运行时改一遍等价于重写整个文档头，漏一处就会产生自相矛盾的页面。整页导航让浏览器
 * 加载该语言真实存在的那份 HTML（见 design 决策 6）。
 */
export function LanguageSwitcher() {
  const { locale, t, setLocale } = useLocale();

  const changeLocale = (next: LocaleCode) => {
    if (next === locale) return;
    // 先记住偏好：整页导航后由 LocaleProvider 在首帧前读回
    setLocale(next);
    window.location.assign(languageSwitchPath(window.location.pathname, next));
  };

  return (
    <Select
      value={locale}
      onValueChange={(value) => changeLocale(value as LocaleCode)}
    >
      <SelectTrigger
        className="language-switcher"
        aria-label={t("header.languageLabel")}
      >
        {/*
          直接渲染当前语言名，而不是用 <SelectValue />：后者在**组件级** SSR 里
          渲染为空（Radix 只在客户端填充它），触发器会只剩一个箭头图标 ——
          客户端首次绘制时看不到「当前是哪种语言」，与 spec 的「标明当前语言」
          不符。注意站点整体是客户端渲染（入口 HTML 只有 #root），因此这里修的是
          组件自身的可读性，而不是构建产物的静态内容。
        */}
        <span className="language-current">{LOCALES[locale].displayName}</span>
      </SelectTrigger>
      <SelectContent>
        {LOCALE_CODES.map((code) => (
          <SelectItem key={code} value={code} className="language-option">
            {LOCALES[code].displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
