import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { FrameExtractor } from "@/App";
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
        createElement(FrameExtractor),
      ),
      locale,
    ),
  );

describe("FrameExtractor welcome regression", () => {
  it("AC-12: renders the drop prompt on the welcome screen without a video", () => {
    assert.match(render("zh-CN"), /把视频放到这里/);
  });

  it("三种语言各自的欢迎页文案", () => {
    assert.match(render("en"), /Drop your video here/);
    assert.match(render("zh-CN"), /把视频放到这里/);
    assert.match(render("ja"), /ここに動画をドロップ/);
  });

  it("英语欢迎页不含中文", () => {
    assert.doesNotMatch(render("en"), /[\u4e00-\u9fff]/);
  });
});
