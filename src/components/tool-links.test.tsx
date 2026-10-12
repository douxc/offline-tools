import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { LocaleCode } from "@/lib/i18n/locales";
import { withLocale } from "@/lib/i18n/test-locale";
import { ToolLinks } from "./tool-links";

/** SSR 测试没有 provider 时退回默认语言，因此断言文案要显式指定语言。 */
const render = (
  props: { exclude?: Parameters<typeof ToolLinks>[0]["exclude"] } = {},
  locale: LocaleCode = "zh-CN",
) => renderToString(withLocale(createElement(ToolLinks, props), locale));

describe("ToolLinks", () => {
  it("默认列出全部 6 个工具链接（不含首页）", () => {
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
    assert.equal((html.match(/<a /g) ?? []).length, 6);
  });

  it("exclude 排除当前工具自身", () => {
    const html = render({ exclude: "video-frame" });
    assert.doesNotMatch(html, /href="\/zh\/video-frame\/"/);
    assert.match(html, /href="\/zh\/video-compress\/"/);
  });
});

describe("ToolLinks 文案与链接随语言变化", () => {
  it("中文渲染中文工具名", () => {
    const html = render({}, "zh-CN");
    assert.match(html, /相关工具/);
    assert.match(html, /视频取帧/);
    assert.match(html, /证件照/);
  });

  it("英语渲染英语工具名且链接无前缀", () => {
    const html = render({}, "en");
    assert.match(html, /Related tools/);
    assert.match(html, /Frame extractor/);
    assert.match(html, /href="\/video-frame\/"/);
    assert.doesNotMatch(html, /href="\/en\//);
  });

  it("日语渲染日语工具名且链接带 /ja 前缀", () => {
    const html = render({}, "ja");
    assert.match(html, /関連ツール/);
    assert.match(html, /フレーム抽出/);
    assert.match(html, /href="\/ja\/video-frame\/"/);
  });

  it("三种语言的链接前缀各不相同", () => {
    assert.match(render({}, "en"), /href="\/id-photo\/"/);
    assert.match(render({}, "zh-CN"), /href="\/zh\/id-photo\/"/);
    assert.match(render({}, "ja"), /href="\/ja\/id-photo\/"/);
  });
});
