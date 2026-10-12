import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ToolHome } from "@/ToolHome";
import type { LocaleCode } from "@/lib/i18n/locales";
import { withLocale } from "@/lib/i18n/test-locale";
import { ThemeProvider } from "@/lib/theme";

/** SSR 测试没有 provider 时退回默认语言，因此断言文案要显式指定语言。 */
const render = (locale: LocaleCode = "zh-CN") =>
  renderToString(
    withLocale(
      createElement(
        ThemeProvider,
        { initialTheme: "dark" },
        createElement(ToolHome),
      ),
      locale,
    ),
  );

describe("ToolHome", () => {
  it("AC-11: lists the video compression tool card", () => {
    const html = render();

    assert.match(html, /视频压缩/);
    assert.match(html, /证件照/);
    assert.match(html, /href="\/zh\/id-photo\/"/);
  });

  it("列出全部六个工具卡片", () => {
    const html = render();
    for (const path of [
      "video-frame",
      "video-compress",
      "image-compress",
      "image-watermark",
      "id-photo",
      "image-a4-layout",
    ]) {
      assert.match(html, new RegExp(`href="/zh/${path}/"`), path);
    }
  });
});

describe("ToolHome 随语言变化", () => {
  it("英语渲染英语首页文案与无前缀链接", () => {
    const html = render("en");
    assert.match(html, /Your files stay on your device\./);
    assert.match(html, /Frame extractor/);
    assert.match(html, /href="\/video-frame\/"/);
    assert.doesNotMatch(html, /href="\/en\//);
    assert.doesNotMatch(html, /[\u4e00-\u9fff]/);
  });

  it("日语渲染日语首页文案与 /ja 前缀链接", () => {
    const html = render("ja");
    assert.match(html, /ファイルは端末の中に。/);
    assert.match(html, /フレーム抽出/);
    assert.match(html, /href="\/ja\/video-frame\//);
  });

  it("三种语言的首页标题互不相同", () => {
    const zh = render("zh-CN");
    const en = render("en");
    const ja = render("ja");
    assert.match(zh, /文件留在本机，/);
    assert.ok(!zh.includes("Your files stay"));
    assert.ok(!en.includes("文件留在本机"));
    assert.ok(!ja.includes("文件留在本机"));
  });
});
