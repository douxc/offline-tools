import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENTRY_MODULE_TOKEN, renderEntryHtml } from "./entry-html";
import { listHreflang } from "./hreflang";
import { LOCALE_CODES, LOCALES } from "./locales";
import { seoContentFor, seoPathFor } from "./seo-content";
import { TOOL_PATHS, type ToolRoute } from "../tool-navigation";

const ALL_ROUTES: ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "id-photo",
  "image-a4-layout",
];

const render = (locale: (typeof LOCALE_CODES)[number], route: ToolRoute) =>
  renderEntryHtml(locale, route);

describe("renderEntryHtml 占位符与基本结构", () => {
  it("21 组入口都保留三个构建期占位符", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        const html = render(locale, route);
        assert.ok(
          html.includes("__SITE_URL__"),
          `${locale} × ${route} 缺少 __SITE_URL__ 占位符`,
        );
        assert.ok(
          html.includes("__ANALYTICS_ID__"),
          `${locale} × ${route} 缺少 __ANALYTICS_ID__ 占位符`,
        );
        assert.ok(
          html.includes(ENTRY_MODULE_TOKEN),
          `${locale} × ${route} 缺少模块入口占位符`,
        );
        // 渲染器不得自己写死**站点**地址；`https://schema.org` 是 JSON-LD 的
        // 词汇表命名空间，不是站点地址，允许出现（site-url spec 同样豁免）。
        const siteUrls = [
          ...html.matchAll(/https?:\/\/[a-z0-9.-]+/gi),
        ]
          .map(([match]) => match)
          .filter((url) => !url.includes("schema.org"));
        assert.deepEqual(
          siteUrls,
          [],
          `${locale} × ${route} 出现写死的站点绝对地址`,
        );
      }
    }
  });

  it("每个入口都有必需的 head 元素与挂载点", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        const html = render(locale, route);
        assert.match(html, /<meta charset="UTF-8" \/>/);
        assert.match(html, /name="viewport"/);
        assert.match(html, /name="description"/);
        assert.match(html, /name="keywords"/);
        assert.match(html, /name="robots"/);
        assert.match(html, /property="og:url"/);
        assert.match(html, /name="twitter:title"/);
        assert.match(html, /rel="canonical"/);
        assert.match(html, /id="structured-data" type="application\/ld\+json"/);
        assert.match(html, /id="root"/);
        assert.match(html, /manifest|icon/);
      }
    }
  });

  it("lang 与 og:locale 与页面语言一致", () => {
    for (const locale of LOCALE_CODES) {
      const html = render(locale, "home");
      assert.match(html, new RegExp(`<html lang="${LOCALES[locale].htmlLang}"`));
      assert.match(
        html,
        new RegExp(`property="og:locale" content="${LOCALES[locale].ogLocale}"`),
      );
    }
    assert.match(render("en", "home"), /<html lang="en"/);
    assert.match(render("zh-CN", "home"), /<html lang="zh-CN"/);
    assert.match(render("ja", "home"), /<html lang="ja"/);
  });

  it("首帧主题脚本在 </head> 之前且早于模块脚本", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        const html = render(locale, route);
        const scriptAt = html.indexOf("offline-tools-theme");
        assert.ok(scriptAt > 0, `${locale} × ${route} 缺少主题脚本`);
        assert.ok(scriptAt < html.indexOf("</head>"), `${locale} × ${route}`);
        assert.ok(
          scriptAt < html.indexOf(ENTRY_MODULE_TOKEN),
          `${locale} × ${route} 主题脚本须早于模块脚本`,
        );
        assert.match(html, /classList\.add\("dark"\)/);
        assert.match(html, /classList\.add\("light"\)/);
      }
    }
  });
});

describe("renderEntryHtml canonical 与 hreflang", () => {
  it("canonical 自指且带语言前缀", () => {
    assert.match(
      render("en", "video-frame"),
      /rel="canonical"\s*\n\s*href="__SITE_URL__\/video-frame\/"/,
    );
    assert.match(
      render("zh-CN", "video-frame"),
      /rel="canonical"\s*\n\s*href="__SITE_URL__\/zh\/video-frame\/"/,
    );
    assert.match(
      render("ja", "image-compress"),
      /rel="canonical"\s*\n\s*href="__SITE_URL__\/ja\/image-compress\/"/,
    );
  });

  it("每个入口声明四条 alternate（三语言 + x-default）", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        const html = render(locale, route);
        const alternates = [
          ...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)" \/>/g),
        ].map(([, hreflang, href]) => ({ hreflang, href }));
        assert.equal(alternates.length, 4, `${locale} × ${route} alternate 数量`);
        assert.deepEqual(
          alternates.map((entry) => entry.hreflang).sort(),
          ["en", "ja", "x-default", "zh-CN"],
          `${locale} × ${route} 的 hreflang 集合`,
        );
      }
    }
  });

  it("英语 alternate 与 x-default 都指向根路径", () => {
    const html = render("ja", "video-compress");
    assert.match(html, /hreflang="en" href="__SITE_URL__\/video-compress\/"/);
    assert.match(
      html,
      /hreflang="x-default" href="__SITE_URL__\/video-compress\/"/,
    );
    assert.match(
      html,
      /hreflang="zh-CN" href="__SITE_URL__\/zh\/video-compress\/"/,
    );
    assert.match(
      html,
      /hreflang="ja" href="__SITE_URL__\/ja\/video-compress\/"/,
    );
  });

  it("互指关系闭合：任一语言声明的集合在每种语言下相同", () => {
    for (const route of ALL_ROUTES) {
      const sets = LOCALE_CODES.map((locale) =>
        listHreflang(locale, route)
          .map((entry) => `${entry.hreflang}=${entry.path}`)
          .sort()
          .join("|"),
      );
      assert.equal(new Set(sets).size, 1, `${route} 的互指集合在语言间不一致`);
    }
  });

  it("og:url 与 canonical 一致", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        const html = render(locale, route);
        const canonical = html.match(/rel="canonical"\s*\n\s*href="([^"]+)"/)?.[1];
        const ogUrl = html.match(/property="og:url"\s*\n\s*content="([^"]+)"/)?.[1];
        assert.equal(ogUrl, canonical, `${locale} × ${route}`);
      }
    }
  });
});

describe("renderEntryHtml JSON-LD", () => {
  it("结构化数据是合法 JSON 且含应有的 @type", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        const html = render(locale, route);
        const raw = html.match(
          /<script id="structured-data" type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
        )?.[1];
        assert.ok(raw, `${locale} × ${route} 未找到结构化数据`);
        const parsed = JSON.parse(raw);
        const types = (parsed["@graph"] as Array<Record<string, unknown>>).map(
          (entry) => entry["@type"],
        );
        if (route === "home") {
          assert.ok(types.includes("WebSite"), `${locale} 首页缺 WebSite`);
          assert.ok(types.includes("CollectionPage"), `${locale} 首页缺 CollectionPage`);
        } else {
          assert.ok(types.includes("BreadcrumbList"), `${locale} × ${route}`);
          assert.ok(types.includes("WebApplication"), `${locale} × ${route}`);
        }
      }
    }
  });

  it("inLanguage 与页面语言一致", () => {
    for (const locale of LOCALE_CODES) {
      const html = render(locale, "video-frame");
      const raw = html.match(
        /<script id="structured-data" type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
      )![1];
      const parsed = JSON.parse(raw);
      const app = (parsed["@graph"] as Array<Record<string, unknown>>).find(
        (entry) => entry["@type"] === "WebApplication",
      )!;
      assert.equal(app["inLanguage"], LOCALES[locale].htmlLang);
    }
  });

  it("中文标题的尖括号不会提前结束脚本块", () => {
    // 直接用带 < > 的内容驱动渲染器，确认 JSON 转义生效
    const html = render("zh-CN", "image-a4-layout");
    const scriptBody = html.split('type="application/ld+json">')[1].split("</script>")[0];
    assert.doesNotMatch(scriptBody, /[<>]/, "JSON-LD 内不得出现裸尖括号");
  });

  it("首页 ItemList 列出六个工具", () => {
    for (const locale of LOCALE_CODES) {
      const html = render(locale, "home");
      const raw = html.match(
        /<script id="structured-data" type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
      )![1];
      const parsed = JSON.parse(raw);
      const collection = (
        parsed["@graph"] as Array<Record<string, unknown>>
      ).find((entry) => entry["@type"] === "CollectionPage")!;
      const list = (collection["mainEntity"] as Record<string, unknown>)[
        "itemListElement"
      ] as unknown[];
      assert.equal(list.length, 6, `${locale} 首页 ItemList 条目数`);
    }
  });
});

describe("renderEntryHtml 与迁移前入口页快照结构一致", () => {
  // 迁移前线上入口页的快照（手写入口页已由构建期生成取代）
  const ENTRY_FILES: Record<string, string> = {
    home: "home.html",
    "video-frame": "video-frame.html",
    "video-compress": "video-compress.html",
    "image-compress": "image-compress.html",
    "image-watermark": "image-watermark.html",
    "id-photo": "id-photo.html",
    "image-a4-layout": "image-a4-layout.html",
  };

  const normalize = (html: string): string =>
    html.replace(/\s+/g, " ").trim();

  it("生成的中文入口包含迁移前快照的全部关键 meta 与标题", async () => {
    const { readFile } = await import("node:fs/promises");
    for (const route of ALL_ROUTES) {
      const html = render("zh-CN", route);
      const live = await readFile(
        new URL(
          `../../../tests/fixtures/legacy-entries/${ENTRY_FILES[route]}`,
          import.meta.url,
        ),
        "utf8",
      );
      const content = seoContentFor("zh-CN", route);

      // 标题
      assert.equal(html.match(/<title>([^<]*)<\/title>/)?.[1], content.title);
      assert.equal(live.match(/<title>([^<]*)<\/title>/)?.[1], content.title);

      // 描述与关键词
      const desc = (source: string) =>
        source.match(/name="description"\s*\n?\s*content="([^"]*)"/)?.[1];
      assert.equal(desc(html), desc(live), `${route} description 不一致`);

      // canonical 路径（现有中文页在根路径，生成的中文页带 /zh；这里比对工具段）
      const canonicalPath = (source: string) =>
        source.match(/rel="canonical"\s*\n\s*href="__SITE_URL__([^"]*)"/)?.[1];
      assert.equal(
        canonicalPath(html),
        seoPathFor("zh-CN", route),
        `${route} canonical 路径`,
      );
      assert.equal(
        canonicalPath(live),
        TOOL_PATHS[route],
        `${route} 迁移前快照 canonical 路径`,
      );

      // noscript 结构
      assert.match(normalize(html), /<noscript>/, `${route} 缺少 noscript`);
    }
  });
});
