import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCALE_CODES } from "./locales";
import { SEO_LONG_FORM, seoLongFormFor, type SeoContentTool } from "./seo-long-form";

const TOOLS: SeoContentTool[] = [
  "video",
  "compress",
  "watermark",
  "a4",
  "id-photo",
];

describe("正文 SEO 长文（三语）", () => {
  it("三种语言 × 五个工具全部齐备", () => {
    assert.deepEqual(Object.keys(SEO_LONG_FORM).sort(), ["en", "ja", "zh-CN"]);
    for (const locale of LOCALE_CODES) {
      for (const tool of TOOLS) {
        const form = seoLongFormFor(locale, tool);
        assert.ok(form, `${locale} × ${tool} 缺失`);
        for (const field of ["eyebrow", "title", "introduction"] as const) {
          assert.ok(
            form[field].length > 0,
            `${locale} × ${tool} 的 ${field} 为空`,
          );
        }
        assert.equal(
          form.details.length,
          3,
          `${locale} × ${tool} 应有三个说明段落`,
        );
        for (const detail of form.details) {
          assert.ok(detail.title.length > 0, `${locale} × ${tool} 段落标题为空`);
          assert.ok(detail.text.length > 0, `${locale} × ${tool} 段落正文为空`);
        }
      }
    }
  });

  it("标题在三种语言下互不相同（确实翻译了）", () => {
    for (const tool of TOOLS) {
      const titles = LOCALE_CODES.map((l) => seoLongFormFor(l, tool).title);
      assert.equal(
        new Set(titles).size,
        LOCALE_CODES.length,
        `${tool} 的标题在语言间重复`,
      );
    }
  });

  it("引言在三种语言下互不相同", () => {
    for (const tool of TOOLS) {
      const intros = LOCALE_CODES.map((l) => seoLongFormFor(l, tool).introduction);
      assert.equal(new Set(intros).size, LOCALE_CODES.length, `${tool} 引言重复`);
    }
  });

  it("英语与日语正文不含中文（未翻译的残留）", () => {
    for (const locale of ["en", "ja"] as const) {
      for (const tool of TOOLS) {
        const form = seoLongFormFor(locale, tool);
        const text = [
          form.title,
          form.introduction,
          ...form.details.flatMap((d) => [d.title, d.text]),
        ].join(" ");
        // 日语会用到汉字，因此只对英语断言「无中文字符」
        if (locale === "en") {
          assert.doesNotMatch(
            text,
            /[\u4e00-\u9fff]/,
            `英语 ${tool} 的长文含中文字符`,
          );
        }
      }
    }
  });

  it("中文长文保留既有文案（迁移不得改写）", () => {
    assert.equal(
      seoLongFormFor("zh-CN", "video").title,
      "在线视频取帧：逐帧截图并导出原始画质图片",
    );
    assert.equal(
      seoLongFormFor("zh-CN", "compress").title,
      "在线图片压缩：批量减小 PNG、JPG 与 WebP 体积",
    );
    assert.equal(
      seoLongFormFor("zh-CN", "watermark").title,
      "在线图片加水印：批量添加可调节的文字水印",
    );
    assert.equal(
      seoLongFormFor("zh-CN", "a4").title,
      "图片 A4 排版：按每行张数流动排版并打印",
    );
    assert.equal(
      seoLongFormFor("zh-CN", "id-photo").title,
      "证件照：常用尺寸裁切与自定义等比缩放",
    );
    assert.equal(seoLongFormFor("zh-CN", "video").eyebrow, "使用说明");
  });

  it("每段的标题在三种语言下互不相同", () => {
    for (const tool of TOOLS) {
      for (let index = 0; index < 3; index += 1) {
        const titles = LOCALE_CODES.map(
          (l) => seoLongFormFor(l, tool).details[index].title,
        );
        assert.equal(
          new Set(titles).size,
          LOCALE_CODES.length,
          `${tool} 第 ${index + 1} 段标题在语言间重复`,
        );
      }
    }
  });
});
