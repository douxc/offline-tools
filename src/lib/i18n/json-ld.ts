/**
 * 结构化数据（JSON-LD）的**唯一构造实现**。
 *
 * 构建期（`entry-html.ts` 生成入口页）与运行期（`seo.ts` 在路由切换时更新
 * `<script id="structured-data">`）共用本模块，因此静态 HTML 与客户端更新
 * 不可能出现两份不同的结构化数据 —— 这正是改造前 `SEO_PAGES` 与手写入口页
 * 各写一份、只能靠测试防漂移的问题。
 *
 * 与语言数据模块一样不得 import React 或浏览器全局。
 */
import type { LocaleCode } from "./locales";
import { DEFAULT_HOME_PATH } from "./routes";
import {
  languageTagFor,
  seoContentFor,
  seoPathFor,
  SITE_META,
  toolListFor,
} from "./seo-content";
import type { ToolRoute } from "./tool-routes";

/** 生成该语言该工具的 JSON-LD 图（首页为 WebSite + CollectionPage）。 */
export const buildJsonLd = (locale: LocaleCode, route: ToolRoute) => {
  const inLanguage = languageTagFor(locale);
  const pagePath = seoPathFor(locale, route);
  const content = seoContentFor(locale, route);

  if (route === "home") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: content.applicationNameJsonLd,
          alternateName: content.applicationName,
          url: `__SITE_URL__${pagePath}`,
          inLanguage,
        },
        {
          "@type": "CollectionPage",
          name: content.applicationNameJsonLd,
          url: `__SITE_URL__${pagePath}`,
          description: content.jsonLdDescription,
          inLanguage,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: toolListFor(locale).map((entry, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: entry.name,
              url: `__SITE_URL__${entry.path}`,
            })),
          },
        },
      ],
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: content.breadcrumbHomeName,
            item: `__SITE_URL__${DEFAULT_HOME_PATH}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: content.applicationNameJsonLd,
            item: `__SITE_URL__${pagePath}`,
          },
        ],
      },
      {
        "@type": "WebApplication",
        name: content.applicationNameJsonLd,
        url: `__SITE_URL__${pagePath}`,
        description: content.jsonLdDescription,
        applicationCategory: content.category,
        applicationSubCategory: SITE_META.applicationSubCategory,
        operatingSystem: SITE_META.operatingSystem,
        browserRequirements: SITE_META.browserRequirements,
        inLanguage,
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: SITE_META.offerPrice,
          priceCurrency: SITE_META.offerPriceCurrency,
        },
        featureList: content.features,
        image: `__SITE_URL__${SITE_META.ogImagePath}`,
      },
    ],
  };
};
