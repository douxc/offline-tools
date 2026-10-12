import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { LocaleCode } from "@/lib/i18n/locales";
import { withLocale } from "@/lib/i18n/test-locale";
import { ToolTabs } from "./tool-tabs";

/** SSR 测试没有 provider 时退回默认语言，因此断言文案要显式指定语言。 */
const render = (
  props: Parameters<typeof ToolTabs>[0],
  locale: LocaleCode = "zh-CN",
) => renderToString(withLocale(createElement(ToolTabs, props), locale));

describe("ToolTabs", () => {
  it("视频组渲染两个 tab，当前项选中且为真实链接", () => {
    const html = render({ group: "video", active: "video-frame" });

    assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
    assert.match(html, /data-state="active"[^>]*>视频取帧<\/a>/);
    assert.match(html, /href="\/zh\/video-frame\/"/);
    assert.match(html, /href="\/zh\/video-compress\/"/);
    assert.match(html, /视频压缩/);
  });

  it("图片组渲染四个 tab", () => {
    const html = render({ group: "image", active: "image-a4-layout" });

    assert.equal((html.match(/role="tab"/g) ?? []).length, 4);
    assert.match(html, /A4 排版/);
    assert.match(html, /图片压缩/);
    assert.match(html, /添加水印/);
    assert.match(html, /证件照/);
  });

  it("tab 组标签随语言变化", () => {
    assert.match(render({ group: "video", active: "video-frame" }, "en"), /Video tool switch/);
    assert.match(render({ group: "video", active: "video-frame" }, "zh-CN"), /视频工具切换/);
    assert.match(render({ group: "video", active: "video-frame" }, "ja"), /動画ツールの切り替え/);
  });
});

describe("ToolTabs 文案与链接随语言变化", () => {
  it("英语 tab 名与无前缀链接", () => {
    const html = render({ group: "video", active: "video-frame" }, "en");
    assert.match(html, /Frame extractor/);
    assert.match(html, /href="\/video-frame\/"/);
    assert.doesNotMatch(html, /href="\/en\//);
  });

  it("日语 tab 名与 /ja 前缀链接", () => {
    const html = render({ group: "video", active: "video-frame" }, "ja");
    assert.match(html, /フレーム抽出/);
    assert.match(html, /href="\/ja\/video-frame\/"/);
    assert.match(html, /href="\/ja\/video-compress\/"/);
  });

  it("中文 tab 名与 /zh 前缀链接", () => {
    const html = render({ group: "image", active: "id-photo" }, "zh-CN");
    assert.match(html, /href="\/zh\/id-photo\/"/);
    assert.match(html, /href="\/zh\/image-watermark\/"/);
  });
});
