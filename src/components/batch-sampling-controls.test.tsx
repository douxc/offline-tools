import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { BatchSamplingControls } from "./batch-sampling-controls";
import type { SamplingMode } from "@/lib/frame-sampling";

describe("BatchSamplingControls", () => {
  it("AC-11: renders three labeled options, active on the current mode only", () => {
    const html = renderToString(
      createElement(BatchSamplingControls, {
        mode: "evenly" as SamplingMode,
        onModeChange: () => {},
      }),
    );

    assert.match(html, /按时间间隔/);
    assert.match(html, /按帧数间隔/);
    assert.match(html, /均匀取张数/);

    // The active option carries class "active"; the other two do not.
    const activeBlock = html.match(/[^>]*class="[^"]*active[^"]*"[^>]*>均匀取张数/);
    assert.ok(activeBlock, "均匀取张数 option should carry the active class");
    assert.doesNotMatch(
      html,
      /[^>]*class="[^"]*active[^"]*"[^>]*>按时间间隔/,
      "按时间间隔 option must not be active",
    );
    assert.doesNotMatch(
      html,
      /[^>]*class="[^"]*active[^"]*"[^>]*>按帧数间隔/,
      "按帧数间隔 option must not be active",
    );
  });
});
