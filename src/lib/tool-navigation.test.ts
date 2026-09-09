import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TOOL_GROUPS,
  TOOL_LABELS,
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

  it("图片组覆盖三个图片工具且默认图片压缩", () => {
    assert.deepEqual(TOOL_GROUPS.image.routes, [
      "image-compress",
      "image-watermark",
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

describe("TOOL_LABELS / TOOL_PATHS", () => {
  it("每个路由都有显示名与路径", () => {
    for (const route of ALL_ROUTES) {
      assert.ok(TOOL_LABELS[route].length > 0, `${route} 显示名为空`);
      assert.ok(TOOL_PATHS[route].startsWith("/"), `${route} 路径非法`);
    }
  });
});
