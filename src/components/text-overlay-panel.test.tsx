import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { TextOverlayPanel } from "./text-overlay-panel";

describe("TextOverlayPanel", () => {
  it("AC-6: renders the text input, enable label, position buttons and size slider", () => {
    const html = renderToString(
      createElement(TextOverlayPanel, {
        enabled: true,
        onEnabledChange: () => {},
        text: "测试字幕",
        onTextChange: () => {},
        position: "bottom",
        onPositionChange: () => {},
        sizeRatio: 0.04,
        onSizeRatioChange: () => {},
      }),
    );

    assert.match(html, /placeholder="输入字幕文字"/);
    assert.match(html, /导出时叠加文字/);
    assert.match(html, /底部居中/);
    assert.match(html, /顶部居中/);
    assert.match(html, /aria-label="字幕字号"/);
  });
});
