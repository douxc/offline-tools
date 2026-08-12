import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { VideoCompressor } from "./video-compressor";
import { ThemeProvider } from "@/lib/theme";

describe("VideoCompressor", () => {
  it("AC-10: renders the drop prompt and the audio-retention note without a video", () => {
    const html = renderToString(
      createElement(
        ThemeProvider,
        { initialTheme: "dark" },
        createElement(VideoCompressor),
      ),
    );

    assert.match(html, /把视频放到这里/);
    assert.match(html, /原音轨/);
  });
});
