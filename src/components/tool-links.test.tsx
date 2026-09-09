import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ToolLinks } from "./tool-links";

describe("ToolLinks", () => {
  it("默认列出全部 5 个工具链接", () => {
    const html = renderToString(createElement(ToolLinks));

    assert.match(html, /href="\/video-frame\/"/);
    assert.match(html, /href="\/video-compress\/"/);
    assert.match(html, /href="\/image-compress\/"/);
    assert.match(html, /href="\/image-watermark\/"/);
    assert.match(html, /href="\/image-a4-layout\/"/);
  });

  it("exclude 排除当前工具自身", () => {
    const html = renderToString(
      createElement(ToolLinks, { exclude: "video-frame" }),
    );

    assert.doesNotMatch(html, /href="\/video-frame\/"/);
    assert.match(html, /href="\/video-compress\/"/);
  });
});
