import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ToolHeader } from "./tool-header";
import { ThemeProvider } from "@/lib/theme";

const render = (route: Parameters<typeof ToolHeader>[0]["route"]) =>
  renderToString(
    createElement(
      ThemeProvider,
      { initialTheme: "dark" },
      createElement(ToolHeader, { route }),
    ),
  );

describe("ToolHeader（分组导航语义）", () => {
  it("视频页「视频」分组为当前页", () => {
    const html = render("video-frame");
    assert.match(html, /href="\/video-frame\/"[^>]*aria-current="page"[^>]*>视频</);
    assert.doesNotMatch(
      html,
      /href="\/image-compress\/"[^>]*aria-current="page"/,
    );
  });

  it("A4 页「图片」分组为当前页", () => {
    const html = render("image-a4-layout");
    assert.match(html, /href="\/image-compress\/"[^>]*aria-current="page"[^>]*>图片</);
    assert.doesNotMatch(
      html,
      /href="\/video-frame\/"[^>]*aria-current="page"/,
    );
  });

  it("首页无任何分组为当前页", () => {
    const html = render("home");
    assert.doesNotMatch(html, /aria-current="page"/);
  });
});
