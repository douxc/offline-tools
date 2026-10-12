/**
 * 入口页 HTML 的**唯一渲染实现**。
 *
 * dev 中间件与构建期 `load()` 都调用本函数，因此两条路径产出的 HTML 不可能
 * 分歧（改造前 7 个手写入口页与 `SEO_PAGES` 各自维护一份文案，正是漂移的来源）。
 *
 * 本模块不得 import React 或浏览器全局：`vite.config.ts` 在 Node 构建期调用它。
 */
import { listHreflang } from "./hreflang";
import { buildJsonLd } from "./json-ld";
import { LOCALES, type LocaleCode } from "./locales";
import { toolPathInLocale } from "./routes";
import {
  SEO_CONTENT,
  seoContentFor,
  seoPathFor,
  SITE_META,
  toolListFor,
} from "./seo-content";
import type { ToolRoute } from "./tool-routes";

/**
 * 模块入口脚本地址的占位符。
 *
 * dev 下必须指向源码（`/src/main.tsx`），构建产物里必须换成打包后的 JS。
 * 渲染器本身不判断环境 —— 它只写占位符，由 Vite 插件按模式替换。
 */
export const ENTRY_MODULE_TOKEN = "__ENTRY_MODULE__";

/** 首帧主题脚本：与 `src/lib/theme.tsx` 的存储键与取值耦合，由测试守卫。 */
const THEME_SCRIPT = `      // 首帧前应用已保存的主题,避免 next-themes 挂载前出现主题闪烁。
      // 存储键与取值必须与 src/lib/theme.tsx 一致(由 tests/theme-script-embed.test.mjs 守卫)。
      (function () {
        try {
          var stored = localStorage.getItem("offline-tools-theme");
          if (stored === "light") document.documentElement.classList.add("light");
          else document.documentElement.classList.add("dark");
        } catch (error) {
          document.documentElement.classList.add("dark");
        }
      })();`;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * JSON-LD 内联进 `<script>`，因此必须阻断 `</script>` 序列 —— 否则正文里的
 * 一个尖括号就能提前结束脚本块。转义为 `\u003c` 后 JSON 仍可被解析。
 */
const escapeJsonForScript = (json: string): string =>
  json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e");


/** `<noscript>` 块：首页列出全部工具，工具页给出说明与返回本站首页链接。 */
const renderNoscript = (locale: LocaleCode, route: ToolRoute): string => {
  const content = seoContentFor(locale, route);
  const heading = `<h1>${escapeHtml(content.noscriptTitle)}</h1>`;
  const body = `<p>${escapeHtml(content.noscriptBody)}</p>`;

  if (route === "home") {
    const labels = content.noscriptNavLabels ?? {};
    const links = toolListFor(locale)
      .map((entry) => {
        const label = labels[entry.route] ?? entry.name;
        return `        <a href="${toolPathInLocale(locale, entry.route)}">${escapeHtml(label)}</a>`;
      })
      .join("\n");
    return `    <noscript>
      ${heading}
      ${body}
      <nav>
${links}
      </nav>
    </noscript>`;
  }

  return `    <noscript>
      ${heading}
      ${body}
      <a href="${toolPathInLocale(locale, "home")}">${escapeHtml(content.noscriptHomeLabel)}</a>
    </noscript>`;
};

/**
 * 生成一个入口页的完整 HTML。
 *
 * 保留 `__SITE_URL__`、`__ANALYTICS_ID__` 与 `__ENTRY_MODULE__` 三个占位符，
 * 由 Vite 插件在对应阶段替换 —— 因此站点 URL 与统计标识的注入仍统一走既有
 * `siteMetaPlugin`，不在这里另起一套。
 */
export const renderEntryHtml = (
  locale: LocaleCode,
  route: ToolRoute,
): string => {
  const content = seoContentFor(locale, route);
  const pagePath = seoPathFor(locale, route);
  const absolute = (path: string) => `__SITE_URL__${path}`;
  const jsonLd = escapeJsonForScript(
    JSON.stringify(buildJsonLd(locale, route), null, 2),
  );

  const alternates = listHreflang(locale, route)
    .map(
      (entry) =>
        `    <link rel="alternate" hreflang="${entry.hreflang}" href="${absolute(entry.path)}" />`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="${LOCALES[locale].htmlLang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="${SITE_META.viewport}" />
    <meta name="theme-color" content="${SITE_META.themeColor}" />
    <meta
      name="description"
      content="${escapeHtml(content.description)}"
    />
    <meta
      name="keywords"
      content="${escapeHtml(content.keywords)}"
    />
    <meta
      name="robots"
      content="${SITE_META.robots}"
    />
    <meta name="application-name" content="${escapeHtml(content.applicationName)}" />
    <!-- 百度统计站点标识：构建期由 vite.config.ts 注入最终值；空值表示关闭统计。 -->
    <meta name="baidu-tongji-site-id" content="__ANALYTICS_ID__" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${LOCALES[locale].ogLocale}" />
    <meta property="og:site_name" content="${escapeHtml(content.applicationName)}" />
    <meta
      property="og:url"
      content="${absolute(pagePath)}"
    />
    <meta
      property="og:title"
      content="${escapeHtml(content.title)}"
    />
    <meta
      property="og:description"
      content="${escapeHtml(content.ogDescription)}"
    />
    <meta
      property="og:image"
      content="${absolute(SITE_META.ogImagePath)}"
    />
    <meta property="og:image:width" content="${SITE_META.ogImageWidth}" />
    <meta property="og:image:height" content="${SITE_META.ogImageHeight}" />
    <meta property="og:image:alt" content="${escapeHtml(content.ogImageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta
      name="twitter:title"
      content="${escapeHtml(content.twitterTitle)}"
    />
    <meta
      name="twitter:description"
      content="${escapeHtml(content.twitterDescription)}"
    />
    <meta
      name="twitter:image"
      content="${absolute(SITE_META.ogImagePath)}"
    />
    <meta name="twitter:image:alt" content="${escapeHtml(content.ogImageAlt)}" />
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <link rel="apple-touch-icon" href="/pwa-192.png" />
    <link
      rel="canonical"
      href="${absolute(pagePath)}"
    />
${alternates}
    <script id="structured-data" type="application/ld+json">
${jsonLd}
    </script>
    <title>${escapeHtml(content.title)}</title>
    <script>
${THEME_SCRIPT}
    </script>
  </head>
  <body>
    <div id="root"></div>
${renderNoscript(locale, route)}
    <script type="module" src="${ENTRY_MODULE_TOKEN}"></script>
  </body>
</html>
`;
};

/** 全部「语言 × 工具」入口的组合，供插件与测试共用。 */
export const allEntryCombinations = (): ReadonlyArray<{
  locale: LocaleCode;
  route: ToolRoute;
  path: string;
}> =>
  (Object.keys(LOCALES) as LocaleCode[]).flatMap((locale) =>
    (Object.keys(SEO_CONTENT[locale]) as ToolRoute[]).map((route) => ({
      locale,
      route,
      path: seoPathFor(locale, route),
    })),
  );
