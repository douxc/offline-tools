import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { LocaleCode } from "@/lib/i18n/locales";
import { withLocale } from "@/lib/i18n/test-locale";
import { TextOverlayPanel } from "./text-overlay-panel";

/** SSR 测试没有 provider 时退回默认语言，因此断言文案要显式指定语言。 */
const render = (
  props: Parameters<typeof TextOverlayPanel>[0],
  locale: LocaleCode = "zh-CN",
) => renderToString(withLocale(createElement(TextOverlayPanel, props), locale));

describe("TextOverlayPanel", () => {
  it("AC-6: renders the text input, enable label, position buttons and size slider", () => {
    const html = render({
      enabled: true,
      onEnabledChange: () => {},
      text: "测试字幕",
      onTextChange: () => {},
      position: "bottom",
      onPositionChange: () => {},
      sizeRatio: 0.04,
      onSizeRatioChange: () => {},
    });

    assert.match(html, /placeholder="输入字幕文字"/);
    assert.match(html, /导出时叠加文字/);
    assert.match(html, /底部居中/);
    assert.match(html, /顶部居中/);
    assert.match(html, /aria-label="字幕字号"/);
    // 位置分段由 shadcn ToggleGroup 承载,暴露 role=radio + aria-checked 语义
    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-checked="true"[^>]*>底部居中</);
    assert.match(html, /aria-checked="false"[^>]*>顶部居中</);
  });
});
