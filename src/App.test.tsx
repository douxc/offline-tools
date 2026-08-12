import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { FrameExtractor } from "@/App";
import { ThemeProvider } from "@/lib/theme";

describe("FrameExtractor welcome regression", () => {
  it("AC-12: renders the drop prompt on the welcome screen without a video", () => {
    const html = renderToString(
      createElement(ThemeProvider, { initialTheme: "dark" }, createElement(FrameExtractor)),
    );
    assert.match(html, /把视频放到这里/);
  });
});
