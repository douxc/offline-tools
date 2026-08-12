import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ToolHome } from "@/ToolHome";
import { ThemeProvider } from "@/lib/theme";

describe("ToolHome", () => {
  it("AC-11: lists the video compression tool card", () => {
    const html = renderToString(
      createElement(
        ThemeProvider,
        { initialTheme: "dark" },
        createElement(ToolHome),
      ),
    );

    assert.match(html, /视频压缩/);
  });
});
