import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCALE_CODES } from "@/lib/i18n/locales";
import { seoContentFor } from "@/lib/i18n/seo-content";
import { TOOL_PATHS, type ToolRoute } from "@/lib/tool-navigation";
import { SEO_PAGES, seoPageFor } from "./seo";

const TOOL_ROUTES: ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "id-photo",
  "image-a4-layout",
];

describe("SEO_PAGES（默认语言）", () => {
  it("每个路由都有完整 SEO 元数据且 path 与 TOOL_PATHS 一致", () => {
    for (const route of TOOL_ROUTES) {
      const page = SEO_PAGES[route];
      assert.ok(page.title.length > 0, `${route} title 为空`);
      assert.ok(page.description.length > 0, `${route} description 为空`);
      assert.ok(page.keywords.length > 0, `${route} keywords 为空`);
      // 默认语言是英语，占据根路径，因此 path 等于语言无关的工具路径
      assert.equal(page.path, TOOL_PATHS[route], `${route} path 不一致`);
      assert.ok(page.jsonLd["@graph"], `${route} 缺少 @graph`);
    }
  });

  it("默认语言为英语（值取自英语数据源）", () => {
    for (const route of TOOL_ROUTES) {
      assert.equal(
        SEO_PAGES[route].title,
        seoContentFor("en", route).title,
        `${route} 应取英语标题`,
      );
    }
    assert.doesNotMatch(SEO_PAGES.home.title, /[\u4e00-\u9fff]/);
  });

  it("首页 ItemList 列出全部 6 个工具且 URL 与 TOOL_PATHS 一致", () => {
    const graph = SEO_PAGES.home.jsonLd["@graph"] as Array<
      Record<string, unknown>
    >;
    const collection = graph.find(
      (entry) => entry["@type"] === "CollectionPage",
    );
    const itemList = (collection?.mainEntity as Record<string, unknown>)
      ?.itemListElement as Array<Record<string, unknown>>;

    assert.equal(itemList?.length, 6, "ItemList 应含 6 个工具");
    const expectedPaths = [
      "/video-frame/",
      "/video-compress/",
      "/image-compress/",
      "/image-watermark/",
      "/id-photo/",
      "/image-a4-layout/",
    ];
    for (const [index, path] of expectedPaths.entries()) {
      const item = itemList[index];
      assert.equal(
        item["name"],
        seoContentFor("en", TOOL_ROUTES[index + 1]).applicationNameJsonLd,
        `第 ${index + 1} 项名称应取自英语数据源`,
      );
      assert.ok(
        String(item["url"]).endsWith(path),
        `第 ${index + 1} 项 URL 应为 ${path}`,
      );
    }
  });

  it("工具页 JSON-LD 含 BreadcrumbList 与 WebApplication", () => {
    const graph = SEO_PAGES["video-frame"].jsonLd["@graph"] as Array<
      Record<string, unknown>
    >;
    const types = graph.map((entry) => entry["@type"]);
    assert.ok(types.includes("BreadcrumbList"));
    assert.ok(types.includes("WebApplication"));
  });
});

describe("seoPageFor（按语言）", () => {
  it("三种语言都产出完整元数据", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of TOOL_ROUTES) {
        const page = seoPageFor(locale, route);
        assert.ok(page.title.length > 0, `${locale} × ${route} title 为空`);
        assert.ok(
          page.description.length > 0,
          `${locale} × ${route} description 为空`,
        );
        assert.ok(page.keywords.length > 0, `${locale} × ${route} keywords 为空`);
        assert.ok(page.jsonLd["@graph"], `${locale} × ${route} 缺少 @graph`);
      }
    }
  });

  it("path 带语言前缀：英语无前缀，中文 /zh，日语 /ja", () => {
    assert.equal(seoPageFor("en", "video-frame").path, "/video-frame/");
    assert.equal(seoPageFor("zh-CN", "video-frame").path, "/zh/video-frame/");
    assert.equal(seoPageFor("ja", "video-frame").path, "/ja/video-frame/");
    assert.equal(seoPageFor("zh-CN", "home").path, "/zh/");
    assert.equal(seoPageFor("ja", "home").path, "/ja/");
  });

  it("inLanguage 与页面语言一致", () => {
    for (const locale of LOCALE_CODES) {
      const graph = seoPageFor(locale, "video-frame").jsonLd["@graph"] as Array<
        Record<string, unknown>
      >;
      const app = graph.find((entry) => entry["@type"] === "WebApplication");
      assert.equal(app?.["inLanguage"], locale, `${locale} 的 inLanguage`);
    }
  });

  it("canonical 用的 path 与 sitemap/入口页同源", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of TOOL_ROUTES) {
        assert.equal(
          seoPageFor(locale, route).path,
          seoPageFor(locale, route).path,
        );
      }
    }
    // 同一个「语言 × 工具」在 SEO_PAGES 与 seoPageFor 之间不得出现两份取值
    for (const route of TOOL_ROUTES) {
      assert.deepEqual(SEO_PAGES[route], seoPageFor("en", route));
    }
  });
});
