import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ToolTabs } from "./tool-tabs";

describe("ToolTabs", () => {
  it("视频组渲染两个 tab，当前项选中且为真实链接", () => {
    const html = renderToString(
      createElement(ToolTabs, { group: "video", active: "video-frame" }),
    );

    assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
    assert.match(html, /data-state="active"[^>]*>视频取帧<\/a>/);
    assert.match(html, /href="\/video-frame\/"/);
    assert.match(html, /href="\/video-compress\/"/);
    assert.match(html, /视频压缩/);
  });

  it("图片组渲染三个 tab", () => {
    const html = renderToString(
      createElement(ToolTabs, { group: "image", active: "image-a4-layout" }),
    );

    assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
    assert.match(html, /A4 排版/);
    assert.match(html, /图片压缩/);
    assert.match(html, /添加水印/);
  });
});
