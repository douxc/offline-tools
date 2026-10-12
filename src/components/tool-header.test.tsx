import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ToolHeader } from "./tool-header";
import { withLocale } from "@/lib/i18n/test-locale";
import type { LocaleCode } from "@/lib/i18n/locales";
import { ThemeProvider } from "@/lib/theme";

/**
 * 断言某种语言的文案时必须显式包对应 provider：
 * SSR 测试没有 DOM、也没有 provider，`useLocale` 会退回默认语言（英语）。
 */
const render = (
  route: Parameters<typeof ToolHeader>[0]["route"],
  locale: LocaleCode = "zh-CN",
) =>
  renderToString(
    withLocale(
      createElement(
        ThemeProvider,
        { initialTheme: "dark" },
        createElement(ToolHeader, { route }),
      ),
      locale,
    ),
  );

describe("ToolHeader（分组导航语义）", () => {
  it("视频页「视频」分组为当前页", () => {
    const html = render("video-frame");
    // 中文页面的链接带 /zh 前缀（站内链接跟随当前语言）
    assert.match(html, /href="\/zh\/video-frame\/"[^>]*aria-current="page"[^>]*>视频</);
    assert.doesNotMatch(
      html,
      /href="\/zh\/image-compress\/"[^>]*aria-current="page"/,
    );
  });

  it("A4 页「图片」分组为当前页", () => {
    const html = render("image-a4-layout");
    assert.match(html, /href="\/zh\/image-compress\/"[^>]*aria-current="page"[^>]*>图片</);
    assert.doesNotMatch(
      html,
      /href="\/zh\/video-frame\/"[^>]*aria-current="page"/,
    );
  });

  it("首页无任何分组为当前页", () => {
    const html = render("home");
    assert.doesNotMatch(html, /aria-current="page"/);
  });
});

describe("ToolHeader 文案随语言变化", () => {
  it("英语渲染英语分组名与页头文案", () => {
    const html = render("video-frame", "en");
    assert.match(html, />Video</);
    assert.match(html, /Processed locally · nothing uploaded/);
    assert.match(html, /Tool navigation/);
  });

  it("中文渲染中文分组名与页头文案", () => {
    const html = render("video-frame", "zh-CN");
    assert.match(html, />视频</);
    assert.match(html, /本地处理 · 不上传文件/);
    assert.match(html, /工具导航/);
  });

  it("日语渲染日语分组名", () => {
    const html = render("video-frame", "ja");
    assert.match(html, />動画</);
    assert.match(html, /端末内で処理 · アップロードなし/);
  });

  it("品牌名与首页链接随语言", () => {
    assert.match(render("home", "en"), />Offline Tools</);
    assert.match(render("home", "zh-CN"), />离线工具</);
    assert.match(render("home", "ja"), />オフラインツール</);
  });
});

describe("ToolHeader 站内链接跟随当前语言", () => {
  it("日语下分组与品牌链接带 /ja 前缀", () => {
    const html = render("video-frame", "ja");
    assert.match(html, /href="\/ja\/video-frame\/"/);
    assert.match(html, /href="\/ja\/"/);
  });

  it("中文下链接带 /zh 前缀", () => {
    const html = render("video-frame", "zh-CN");
    assert.match(html, /href="\/zh\/video-frame\/"/);
    assert.match(html, /href="\/zh\/"/);
  });

  it("英语下链接无前缀", () => {
    const html = render("video-frame", "en");
    assert.match(html, /href="\/video-frame\/"/);
    assert.doesNotMatch(html, /href="\/en\//);
  });
});
