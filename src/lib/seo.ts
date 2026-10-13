import { useEffect } from "react";
import { buildJsonLd } from "@/lib/i18n/json-ld";
import {
  LOCALES,
  resolveLocale,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { seoContentFor, seoPathFor } from "@/lib/i18n/seo-content";
import { OG_IMAGE_URL, SITE_URL } from "@/lib/site";
import type { ToolRoute } from "@/lib/tool-navigation";

type SeoPage = {
  title: string;
  description: string;
  keywords: string;
  path: string;
  jsonLd: Record<string, unknown>;
};

/**
 * 按「语言 + 工具」取 SEO 元数据。
 *
 * 数据来自 `src/lib/i18n/seo-content.ts` —— 与构建期生成入口页用的是**同一份**；
 * JSON-LD 由 `json-ld.ts` 的唯一实现构造。因此静态 HTML 与客户端更新不可能漂移，
 * 而改造前 `SEO_PAGES` 与 7 个手写入口页各写一份文案、只能靠测试防漂移。
 */
export const seoPageFor = (locale: LocaleCode, route: ToolRoute): SeoPage => {
  const content = seoContentFor(locale, route);
  return {
    title: content.title,
    description: content.description,
    keywords: content.keywords,
    path: seoPathFor(locale, route),
    jsonLd: buildJsonLd(locale, route) as unknown as Record<string, unknown>,
  };
};

/**
 * 默认语言（英语）下的 SEO 元数据。
 *
 * 保留 `SEO_PAGES[route].path` 这一形态是因为**语言无关的工具路径**仍被统计
 * 上报使用：PV 口径不随语言变化，既有报表序列因此不被打散。
 */
export const SEO_PAGES: Record<ToolRoute, SeoPage> = {
  home: seoPageFor("en", "home"),
  "video-frame": seoPageFor("en", "video-frame"),
  "video-compress": seoPageFor("en", "video-compress"),
  "image-compress": seoPageFor("en", "image-compress"),
  "image-watermark": seoPageFor("en", "image-watermark"),
  "id-photo": seoPageFor("en", "id-photo"),
  "image-a4-layout": seoPageFor("en", "image-a4-layout"),
};

/**
 * 语言无关的工具路径 —— 统计 PV 口径。
 *
 * 上报必须用这个而不是 `seoPageFor(locale, route).path`：语言进入 URL 后 PV
 * 仍按 7 条工具路径聚合，既有报表序列不被拆成 21 条。
 */
export const analyticsPathFor = (route: ToolRoute): string =>
  SEO_PAGES[route].path;

function setMeta(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute(
    "content",
    content,
  );
}

/**
 * 按路由与语言更新文档头。
 *
 * `locale` 可省略：省略时按当前 URL 与已保存偏好解析，调用方不必自己算一遍。
 * 除标题与 canonical 外，这里还同步 `<html lang>`、`og:locale` 与 og/twitter 图片，
 * 使客户端更新后的文档头与静态 HTML 保持一致。
 */
export function useRouteSeo(route: ToolRoute, locale?: LocaleCode) {
  useEffect(() => {
    const resolved =
      locale ?? resolveLocale({ pathname: window.location.pathname });

    const seo = seoPageFor(resolved, route);
    const canonicalUrl = `${SITE_URL}${seo.path}`;

    document.title = seo.title;
    document.documentElement.lang = LOCALES[resolved].htmlLang;
    setMeta('meta[name="description"]', seo.description);
    setMeta('meta[name="keywords"]', seo.keywords);
    setMeta('meta[property="og:locale"]', LOCALES[resolved].ogLocale);
    setMeta('meta[property="og:title"]', seo.title);
    setMeta('meta[property="og:description"]', seo.description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[name="twitter:title"]', seo.title);
    setMeta('meta[name="twitter:description"]', seo.description);
    setMeta('meta[property="og:image"]', OG_IMAGE_URL);
    setMeta('meta[name="twitter:image"]', OG_IMAGE_URL);

    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute("href", canonicalUrl);

    const structuredData = document.querySelector<HTMLScriptElement>(
      "#structured-data",
    );
    if (structuredData) {
      structuredData.textContent = JSON.stringify(seo.jsonLd);
    }
  }, [route, locale]);
}
