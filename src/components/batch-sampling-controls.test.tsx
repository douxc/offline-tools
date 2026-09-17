import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { BatchSamplingControls } from "./batch-sampling-controls";
import type { SamplingMode } from "@/lib/frame-sampling";

describe("BatchSamplingControls", () => {
  it("AC-11: renders three labeled options, checked on the current mode only", () => {
    const html = renderToString(
      createElement(BatchSamplingControls, {
        mode: "evenly" as SamplingMode,
        onModeChange: () => {},
      }),
    );

    assert.match(html, /按时间间隔/);
    assert.match(html, /按帧数间隔/);
    assert.match(html, /均匀取张数/);

    // shadcn 单选 ToggleGroup 暴露 role=radio + aria-checked 语义
    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-label="抽取模式"/);
    const checked = html.match(/aria-checked="true"[^>]*>([^<]*)</)?.[1];
    assert.equal(checked, "均匀取张数", "仅当前模式应为选中项");
    assert.equal(
      (html.match(/aria-checked="true"/g) ?? []).length,
      1,
      "只应有一个选中项",
    );
  });

  it("选中项同时携带 data-state=on,不只依赖颜色", () => {
    const html = renderToString(
      createElement(BatchSamplingControls, {
        mode: "step" as SamplingMode,
        onModeChange: () => {},
      }),
    );
    assert.match(html, /data-state="on"[^>]*>按帧数间隔</);
    assert.equal((html.match(/data-state="on"/g) ?? []).length, 1);
  });
});
