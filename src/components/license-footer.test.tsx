import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { LocaleCode } from "@/lib/i18n/locales";
import { withLocale } from "@/lib/i18n/test-locale";
import { LicenseFooter } from "./license-footer";

/** SSR 测试没有 provider 时退回默认语言（英语），故断言中文文案需显式指定语言。 */
const render = (locale: LocaleCode = "zh-CN") =>
  renderToString(withLocale(createElement(LicenseFooter), locale));

describe("LicenseFooter", () => {
  it("渲染 GPL 声明与两个许可链接", () => {
    const html = render();

    assert.match(html, /GPL-3\.0-or-later/);
    assert.match(html, /href="\/legal\/THIRD_PARTY_NOTICES\.md"/);
    assert.match(html, /href="\/legal\/CORRESPONDING_SOURCE\.md"/);
    assert.match(html, /本地处理/);
  });

  it("统计说明与「不上传文件」声明同时出现，不互相替代", () => {
    const html = render();

    assert.match(html, /不上传文件/);
    assert.match(html, /百度统计/);
    assert.match(html, /license-footer-analytics/);
    // 披露与声明并列在同一页脚内，而不是取而代之
    assert.ok(
      html.indexOf("不上传文件") < html.indexOf("百度统计"),
      "页脚应同时保留不上传声明与统计说明",
    );
  });

  it("许可声明与统计说明随语言变化", () => {
    const en = render("en");
    assert.match(en, /Processed locally · Nothing uploaded/);
    assert.match(en, /Baidu Analytics/);
    assert.match(en, /Third-party licences/);
    assert.match(en, /Corresponding source/);

    const ja = render("ja");
    assert.match(ja, /端末内で処理 · アップロードなし/);
    assert.match(ja, /百度統計/);
    assert.match(ja, /第三者ライセンス/);
  });

  it("三种语言下都同时保留「不上传」声明与统计披露，且声明在前", () => {
    const declarationFor: Record<LocaleCode, string> = {
      "zh-CN": "不上传",
      en: "uploaded",
      ja: "アップロードなし",
    };
    const disclosureFor: Record<LocaleCode, string> = {
      "zh-CN": "百度统计",
      en: "Baidu Analytics",
      ja: "百度統計",
    };

    for (const locale of ["zh-CN", "en", "ja"] as LocaleCode[]) {
      const html = render(locale);
      assert.match(html, /license-footer-analytics/, locale);
      const declaration = html.indexOf(declarationFor[locale]);
      const disclosure = html.indexOf(disclosureFor[locale]);
      assert.ok(declaration >= 0, `${locale} 缺少「不上传」声明`);
      assert.ok(disclosure >= 0, `${locale} 缺少统计披露`);
      assert.ok(declaration < disclosure, `${locale} 声明应在披露之前`);
    }
  });

  it("英文页脚不含中文", () => {
    assert.doesNotMatch(render("en"), /[\u4e00-\u9fff]/);
  });
});
