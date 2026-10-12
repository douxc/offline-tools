import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCALE_CODES, LOCALES } from "./i18n/locales";
import { messagesFor } from "./i18n/messages";
import { groupLabelKey, toolLabelKey } from "./i18n/label-keys";
import { LOCALE_CODES } from "./i18n/locales";
import {
  readToolRoute,
  stripLocalePrefix,
  TOOL_GROUPS,
  TOOL_PATHS,
  toolGroupForRoute,
  type ToolRoute,
} from "./tool-navigation";

const ALL_ROUTES: ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "id-photo",
  "image-a4-layout",
];

describe("TOOL_GROUPS", () => {
  it("导航只有视频/图片两个一级分组", () => {
    assert.deepEqual(Object.keys(TOOL_GROUPS).sort(), ["image", "video"]);
  });

  it("视频组覆盖两个视频工具且默认视频取帧", () => {
    assert.deepEqual(TOOL_GROUPS.video.routes, [
      "video-frame",
      "video-compress",
    ]);
    assert.equal(TOOL_GROUPS.video.default, "video-frame");
  });

  it("图片组覆盖四个图片工具且默认图片压缩", () => {
    assert.deepEqual(TOOL_GROUPS.image.routes, [
      "image-compress",
      "image-watermark",
      "id-photo",
  "image-a4-layout",
    ]);
    assert.equal(TOOL_GROUPS.image.default, "image-compress");
  });
});

describe("toolGroupForRoute", () => {
  it("视频路由归属视频组", () => {
    assert.equal(toolGroupForRoute("video-frame"), "video");
    assert.equal(toolGroupForRoute("video-compress"), "video");
  });

  it("图片路由归属图片组", () => {
    assert.equal(toolGroupForRoute("image-compress"), "image");
    assert.equal(toolGroupForRoute("image-watermark"), "image");
    assert.equal(toolGroupForRoute("image-a4-layout"), "image");
  });

  it("首页不属于任何分组", () => {
    assert.equal(toolGroupForRoute("home"), null);
  });
});

describe("TOOL_PATHS 与词条键", () => {
  it("每个路由都有路径，且词条里有对应的显示名", () => {
    for (const route of ALL_ROUTES) {
      assert.ok(TOOL_PATHS[route].startsWith("/"), `${route} 路径非法`);
      // 显示名已移到词条；三种语言都必须有
      for (const locale of LOCALE_CODES) {
        const label = (messagesFor(locale) as Record<string, unknown>)[
          toolLabelKey(route)
        ];
        assert.equal(
          typeof label,
          "string",
          `${locale} 缺少 ${route} 的显示名`,
        );
        assert.ok((label as string).length > 0, `${locale} 的 ${route} 显示名为空`);
      }
    }
  });

  it("分组只有结构，显示名在词条里", () => {
    for (const group of Object.keys(TOOL_GROUPS) as Array<keyof typeof TOOL_GROUPS>) {
      // 结构字段仍在
      assert.ok(TOOL_GROUPS[group].default, `${group} 缺少 default`);
      assert.ok(TOOL_GROUPS[group].routes.length > 0, `${group} 缺少 routes`);
      // 显示名不再内联在结构里
      assert.ok(
        !("label" in TOOL_GROUPS[group]),
        `${group} 不应再有内联 label（应走词条 group.*）`,
      );
      for (const locale of LOCALE_CODES) {
        const label = (messagesFor(locale) as Record<string, unknown>)[
          groupLabelKey(group)
        ];
        assert.ok(
          typeof label === "string" && label.length > 0,
          `${locale} 缺少分组名 ${group}`,
        );
      }
    }
  });
});

describe("stripLocalePrefix", () => {
  it("剥除已支持的语言前缀", () => {
    assert.equal(stripLocalePrefix("/zh/video-frame/"), "/video-frame/");
    assert.equal(stripLocalePrefix("/ja/id-photo/"), "/id-photo/");
    assert.equal(stripLocalePrefix("/zh"), "/");
    assert.equal(stripLocalePrefix("/ja"), "/");
    assert.equal(stripLocalePrefix("/ja/"), "/");
  });

  it("无前缀路径原样返回", () => {
    assert.equal(stripLocalePrefix("/"), "/");
    assert.equal(stripLocalePrefix("/video-frame/"), "/video-frame/");
  });

  it("形似前缀与不支持的语言前缀不被剥除", () => {
    // /zhx 不是 /zh：不得把 "x/video-frame/" 当成剩余路径
    assert.equal(stripLocalePrefix("/zhx/video-frame/"), "/zhx/video-frame/");
    assert.equal(stripLocalePrefix("/fr/video-frame/"), "/fr/video-frame/");
    assert.equal(stripLocalePrefix("/en/video-frame/"), "/en/video-frame/");
  });
});

describe("readToolRoute 语言路径矩阵", () => {
  it("三种语言 × 七个工具全部识别为同一路由", () => {
    for (const code of LOCALE_CODES) {
      const { prefix } = LOCALES[code];
      for (const route of ALL_ROUTES) {
        // TOOL_PATHS.home 是 "/"，加前缀后即语言首页
        const path =
          route === "home"
            ? `${prefix}/`
            : `${prefix}${TOOL_PATHS[route]}`;
        assert.equal(
          readToolRoute(path),
          route,
          `${path} 应识别为 ${route}`,
        );
      }
    }
  });

  it("语言首页识别为 home（不因前缀变成工具页）", () => {
    assert.equal(readToolRoute("/"), "home");
    assert.equal(readToolRoute("/zh/"), "home");
    assert.equal(readToolRoute("/ja/"), "home");
    assert.equal(readToolRoute("/zh"), "home");
    assert.equal(readToolRoute("/ja"), "home");
  });

  it("带前缀与不带前缀得到相同路由（既有约定不变）", () => {
    for (const route of ALL_ROUTES) {
      if (route === "home") continue;
      const bare = TOOL_PATHS[route];
      assert.equal(readToolRoute(bare), route);
      assert.equal(readToolRoute(`/zh${bare}`), route);
      assert.equal(readToolRoute(`/ja${bare}`), route);
    }
  });

  it("未知前缀不改变工具判定", () => {
    assert.equal(readToolRoute("/fr/video-frame/"), "video-frame");
    assert.equal(readToolRoute("/zhx/video-frame/"), "video-frame");
  });

  it("尾部无斜杠的路径同样识别", () => {
    assert.equal(readToolRoute("/video-frame"), "video-frame");
    assert.equal(readToolRoute("/ja/video-frame"), "video-frame");
  });
});
