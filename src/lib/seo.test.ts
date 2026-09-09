import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOOL_PATHS, type ToolRoute } from "@/lib/tool-navigation";
import { SEO_PAGES } from "./seo";

const TOOL_ROUTES: ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "image-a4-layout",
];

describe("SEO_PAGES", () => {
  it("每个路由都有完整 SEO 元数据且 path 与 TOOL_PATHS 一致", () => {
    for (const route of TOOL_ROUTES) {
      const page = SEO_PAGES[route];
      assert.ok(page.title.length > 0, `${route} title 为空`);
      assert.ok(page.description.length > 0, `${route} description 为空`);
      assert.ok(page.keywords.length > 0, `${route} keywords 为空`);
      assert.equal(page.path, TOOL_PATHS[route], `${route} path 不一致`);
      assert.ok(page.jsonLd["@graph"], `${route} 缺少 @graph`);
    }
  });

  it("首页 ItemList 列出全部 5 个工具且 URL 与 TOOL_PATHS 一致", () => {
    const graph = SEO_PAGES.home.jsonLd["@graph"] as Array<Record<string, unknown>>;
    const collection = graph.find(
      (entry) => entry["@type"] === "CollectionPage",
    );
    const itemList = (collection?.mainEntity as Record<string, unknown>)
      ?.itemListElement as Array<Record<string, unknown>>;

    assert.equal(itemList?.length, 5, "ItemList 应含 5 个工具");
    const expected = [
      ["视频取帧工具", "/video-frame/"],
      ["在线视频压缩工具", "/video-compress/"],
      ["在线图片压缩工具", "/image-compress/"],
      ["图片加水印工具", "/image-watermark/"],
      ["图片 A4 排版打印工具", "/image-a4-layout/"],
    ];
    for (const [index, [name, path]] of expected.entries()) {
      const item = itemList[index];
      assert.equal(item["name"], name, `第 ${index + 1} 项名称`);
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
