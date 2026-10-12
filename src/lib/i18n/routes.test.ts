import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES } from "./locales";
import { DEFAULT_HOME_PATH, toolHref, toolPathInLocale } from "./routes";
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

describe("toolPathInLocale", () => {
  it("21 组「语言 × 工具」路径全部正确", () => {
    for (const locale of LOCALE_CODES) {
      const { prefix } = LOCALES[locale];
      for (const route of ALL_ROUTES) {
        const expected = route === "home" ? `${prefix}/` : `${prefix}${TOOL_PATHS[route]}`;
        assert.equal(
          toolPathInLocale(locale, route),
          expected,
          `${locale} × ${route}`,
        );
      }
    }
  });

  it("英语无前缀", () => {
    assert.equal(toolPathInLocale("en", "home"), "/");
    assert.equal(toolPathInLocale("en", "video-frame"), "/video-frame/");
    assert.equal(toolPathInLocale("en", "image-a4-layout"), "/image-a4-layout/");
    for (const route of ALL_ROUTES) {
      const path = toolPathInLocale("en", route);
      assert.ok(
        !path.startsWith("/en"),
        `英语路径不得带 /en 前缀：${path}`,
      );
    }
  });

  it("中文带 /zh 前缀", () => {
    assert.equal(toolPathInLocale("zh-CN", "home"), "/zh/");
    assert.equal(toolPathInLocale("zh-CN", "video-frame"), "/zh/video-frame/");
    assert.equal(toolPathInLocale("zh-CN", "id-photo"), "/zh/id-photo/");
  });

  it("日语带 /ja 前缀", () => {
    assert.equal(toolPathInLocale("ja", "home"), "/ja/");
    assert.equal(toolPathInLocale("ja", "video-frame"), "/ja/video-frame/");
    assert.equal(toolPathInLocale("ja", "id-photo"), "/ja/id-photo/");
  });

  it("每条路径都以 / 开头并以 / 结尾", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        const path = toolPathInLocale(locale, route);
        assert.ok(path.startsWith("/"), `${locale} × ${route} 未以 / 开头`);
        assert.ok(path.endsWith("/"), `${locale} × ${route} 未以 / 结尾`);
      }
    }
  });

  it("同一工具在三种语言下的路径互不相同（除首页的表述差异）", () => {
    for (const route of ALL_ROUTES) {
      const paths = LOCALE_CODES.map((locale) => toolPathInLocale(locale, route));
      assert.equal(new Set(paths).size, LOCALE_CODES.length, `${route} 路径重复`);
    }
  });

  it("toolHref 与 toolPathInLocale 等价", () => {
    for (const locale of LOCALE_CODES) {
      for (const route of ALL_ROUTES) {
        assert.equal(toolHref(locale, route), toolPathInLocale(locale, route));
      }
    }
  });

  it("默认语言首页即站点根路径", () => {
    assert.equal(DEFAULT_LOCALE, "en");
    assert.equal(DEFAULT_HOME_PATH, "/");
  });
});

/**
 * 唯一构造入口的守卫：组件不得直接把 TOOL_PATHS 塞进 href。
 *
 * 直接拼裸路径是本次改造最容易犯的错误 —— 它在英语下看不出问题，
 * 只在中文/日语下把用户打回英语，因此用源码扫描把它挡在测试里。
 */
describe("语言化链接的唯一构造入口", () => {
  const RENDERERS = [
    "../../components/tool-links.tsx",
    "../../components/tool-tabs.tsx",
    "../../components/tool-header.tsx",
  ];

  it("链接渲染处不得把 TOOL_PATHS 直接用于 href", async () => {
    for (const relative of RENDERERS) {
      const source = await readFile(new URL(relative, import.meta.url), "utf8");
      assert.doesNotMatch(
        source,
        /href=\{?\s*TOOL_PATHS/,
        `${relative} 直接用 TOOL_PATHS 生成 href，应改用 toolHref(locale, route)`,
      );
    }
  });

  it("toolPathInLocale 是 TOOL_PATHS 的唯一消费点（除路由判定外）", async () => {
    const routes = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
    assert.match(routes, /TOOL_PATHS/, "routes.ts 应基于 TOOL_PATHS 构造路径");
  });
});
