import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { LOCALE_CODES, LOCALES } from "./locales";
import {
  ALL_TOOL_ROUTES,
  categoryForRoute,
  LISTED_TOOL_ROUTES,
  languageTagFor,
  seoContentFor,
  seoPathFor,
  toolListFor,
} from "./seo-content";
import { toolPathInLocale } from "./routes";
import { TOOL_PATHS } from "../tool-navigation";

describe("SEO 内容完备性", () => {
  it("三种语言 × 七个工具的内容齐备且字段非空", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_TOOL_ROUTES) {
        const content = seoContentFor(locale, route);
        for (const field of [
          "title",
          "description",
          "keywords",
          "applicationName",
          "ogDescription",
          "ogImageAlt",
          "twitterTitle",
          "twitterDescription",
          "applicationNameJsonLd",
          "jsonLdDescription",
          "category",
          "noscriptTitle",
          "noscriptBody",
          "noscriptHomeLabel",
          "breadcrumbHomeName",
        ] as const) {
          assert.ok(
            content[field].length > 0,
            `${locale} × ${route} 的 ${field} 为空`,
          );
        }
        assert.ok(Array.isArray(content.features), `${locale} × ${route}`);
      }
    }
  });

  it("除首页外每个工具都有 featureList", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of LISTED_TOOL_ROUTES) {
        assert.ok(
          seoContentFor(locale, route).features.length > 0,
          `${locale} × ${route} 缺少 featureList`,
        );
      }
    }
  });

  it("标题在三种语言下互不相同（确实做了翻译而非复制）", () => {
    for (const route of ALL_TOOL_ROUTES) {
      const titles = LOCALE_CODES.map((l) => seoContentFor(l, route).title);
      assert.equal(
        new Set(titles).size,
        LOCALE_CODES.length,
        `${route} 的标题在语言间重复，疑似未翻译`,
      );
    }
  });

  it("描述在三种语言下互不相同", () => {
    for (const route of ALL_TOOL_ROUTES) {
      const descs = LOCALE_CODES.map((l) => seoContentFor(l, route).description);
      assert.equal(new Set(descs).size, LOCALE_CODES.length, `${route} 描述重复`);
    }
  });

  it("页面语言标签与语言一致（lang / hreflang / inLanguage 同源）", () => {
    for (const locale of LOCALE_CODES) {
      assert.equal(languageTagFor(locale), LOCALES[locale].htmlLang);
    }
    assert.equal(languageTagFor("en"), "en");
    assert.equal(languageTagFor("zh-CN"), "zh-CN");
    assert.equal(languageTagFor("ja"), "ja");
  });

  it("seoPathFor 与 routes.ts 的路径一致", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_TOOL_ROUTES) {
        assert.equal(
          seoPathFor(locale, route),
          toolPathInLocale(locale, route),
          `${locale} × ${route}`,
        );
      }
    }
  });

  it("首页列表在每种语言下列出全部六个工具（不含首页）", () => {
    for (const locale of LOCALE_CODES) {
      const list = toolListFor(locale);
      assert.equal(list.length, 6, `${locale} 首页列表条目数不对`);
      assert.ok(
        !list.some((entry) => entry.route === "home"),
        `${locale} 首页列表不应包含首页自身`,
      );
      for (const entry of list) {
        assert.ok(entry.name.length > 0, `${locale} × ${entry.route} 名称为空`);
        assert.ok(
          entry.path.startsWith("/"),
          `${locale} × ${entry.route} 路径非法`,
        );
      }
    }
  });

  it("首页列表条目名称与结构化数据名称同源", () => {
    for (const locale of LOCALE_CODES) {
      for (const entry of toolListFor(locale)) {
        assert.equal(
          entry.name,
          seoContentFor(locale, entry.route).applicationNameJsonLd,
        );
      }
    }
  });

  it("categoryForRoute 为每个工具返回非空类别", () => {
    for (const route of ALL_TOOL_ROUTES) {
      assert.ok(categoryForRoute(route).length > 0, `${route} 类别为空`);
    }
  });

  it("中文内容保留既有取值（迁移不得改写已有文案）", () => {
    // 改造前 7 个手写入口页的标题；迁移到数据源后必须逐字保持，
    // 否则会在不知不觉中改变已收录页面的标题。
    assert.equal(
      seoContentFor("zh-CN", "home").title,
      "离线工具箱｜在线视频取帧、图片压缩与图片加水印",
    );
    assert.equal(
      seoContentFor("zh-CN", "video-frame").title,
      "视频取帧工具｜在线逐帧截图、视频转图片 - 离线工具",
    );
    assert.equal(
      seoContentFor("zh-CN", "video-compress").title,
      "在线视频压缩工具｜浏览器本地压缩导出 WebM - 离线工具",
    );
    assert.equal(
      seoContentFor("zh-CN", "image-compress").title,
      "在线图片压缩工具｜批量压缩 PNG、JPG、WebP - 离线工具",
    );
    assert.equal(
      seoContentFor("zh-CN", "image-watermark").title,
      "图片加水印工具｜在线批量添加文字水印 - 离线工具",
    );
    assert.equal(
      seoContentFor("zh-CN", "id-photo").title,
      "证件照｜一寸二寸裁切与自定义等比缩放 - 离线工具",
    );
    assert.equal(
      seoContentFor("zh-CN", "image-a4-layout").title,
      "图片 A4 排版打印工具｜批量排版照片打印 - 离线工具",
    );
  });
});

/**
 * 用**迁移前线上入口页的快照**校验中文数据源，而不是把文案抄进断言里。
 *
 * 这 7 个手写入口页曾是站点的线上事实来源，现已由构建期生成取代。它们被保留为
 * `tests/fixtures/legacy-entries/` 快照，因为中文文案一旦被无声改写，就是对已
 * 收录页面的内容篡改 —— 这份快照让「生成 = 原线上内容」成为永久回归断言，
 * 而不是只在迁移那一刻成立。
 */
describe("中文数据源与迁移前入口页快照一致", () => {
  const FIXTURE: Record<string, string> = {
    home: "home.html",
    "video-frame": "video-frame.html",
    "video-compress": "video-compress.html",
    "image-compress": "image-compress.html",
    "image-watermark": "image-watermark.html",
    "id-photo": "id-photo.html",
    "image-a4-layout": "image-a4-layout.html",
  };

  const readEntry = async (route: string): Promise<string> =>
    readFile(
      new URL(`../../../tests/fixtures/legacy-entries/${FIXTURE[route]}`, import.meta.url),
      "utf8",
    );

  it("标题与现有入口页的 <title> 逐字一致", async () => {
    for (const route of ALL_TOOL_ROUTES) {
      const html = await readEntry(route);
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
      assert.equal(
        seoContentFor("zh-CN", route).title,
        title,
        `${route} 的标题与迁移前快照不一致`,
      );
    }
  });

  it("六个 meta 字段与现有入口页逐字一致", async () => {
    // 第一版只比对了 title 与 description，漏掉了 og/twitter 四个字段，
    // 结果数据源里多处文案与线上页面不同（例如 ogImageAlt、ogDescription）。
    // 这里逐字段比对，任何一处漂移都会失败。
    const patterns = {
      description: /name="description"\s*content="([^"]*)"/,
      keywords: /name="keywords"\s*content="([^"]*)"/,
      ogDescription: /property="og:description"\s*content="([^"]*)"/,
      ogImageAlt: /property="og:image:alt"\s*content="([^"]*)"/,
      twitterTitle: /name="twitter:title"\s*content="([^"]*)"/,
      twitterDescription: /name="twitter:description"\s*content="([^"]*)"/,
    } as const;

    for (const route of ALL_TOOL_ROUTES) {
      const html = await readEntry(route);
      const content = seoContentFor("zh-CN", route);
      for (const [field, pattern] of Object.entries(patterns)) {
        const live = html.match(pattern)?.[1];
        assert.ok(live, `${route} 迁移前快照缺少 ${field}`);
        assert.equal(
          content[field as keyof typeof content],
          live,
          `${route} 的 ${field} 与迁移前快照不一致`,
        );
      }
    }
  });

  it("noscript 的 h1 与段落与现有入口页逐字一致", async () => {
    for (const route of ALL_TOOL_ROUTES) {
      const html = await readEntry(route);
      const block = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
      const h1 = block.match(/<h1>([^<]*)<\/h1>/)?.[1];
      const p = block.match(/<p>([^<]*)<\/p>/)?.[1];
      const content = seoContentFor("zh-CN", route);
      assert.equal(content.noscriptTitle, h1, `${route} noscript h1 与快照不一致`);
      assert.equal(content.noscriptBody, p, `${route} noscript 段落与快照不一致`);
    }
  });

  it("首页 noscript 导航的六条链接与迁移前快照一致", async () => {
    const html = await readEntry("home");
    const block = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
    const anchors = [...block.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(
      ([, href, label]) => ({ href, label }),
    );
    assert.equal(anchors.length, 6, "快照的首页 noscript 应有六条工具链接");

    const labels = seoContentFor("zh-CN", "home").noscriptNavLabels;
    assert.ok(labels, "首页应提供 noscriptNavLabels");
    for (const { href, label } of anchors) {
      // 现有中文入口页把中文放在根路径，因此这里比对的是**无前缀**工具路径；
      // 生成器产出中文页时会改为 /zh/… ，故不能用 toolPathInLocale("zh-CN") 比对。
      const route = LISTED_TOOL_ROUTES.find(
        (candidate) => TOOL_PATHS[candidate] === href,
      );
      assert.ok(route, `noscript 链接 ${href} 未对应到已知工具`);
      assert.equal(labels[route], label, `${route} 的 noscript 导航文案不一致`);
    }
  });

  it("工具页 noscript 的返回链接指向本站首页（快照）", async () => {
    for (const route of LISTED_TOOL_ROUTES) {
      const html = await readEntry(route);
      const block = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
      assert.match(block, /<a href="\/">/, `${route} 的返回链接应指向 /`);
      assert.equal(
        seoContentFor("zh-CN", route).noscriptHomeLabel,
        block.match(/<a href="\/">([^<]+)<\/a>/)?.[1],
        `${route} 的返回链接文案不一致`,
      );
    }
  });
});
