import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeTextOverlay,
  drawTextOverlay,
  shouldBurnOverlay,
  type TextOverlayCtx,
} from "./text-overlay";

describe("computeTextOverlay", () => {
  it("AC-1: computes a bottom-centered overlay at 1080p with exact values", () => {
    const overlay = computeTextOverlay({
      width: 1920,
      height: 1080,
      text: "测试字幕",
      position: "bottom",
      sizeRatio: 0.04,
    });

    assert.equal(overlay.x, 960);
    assert.equal(overlay.y, 1026.5);
    assert.equal(overlay.textAlign, "center");
    assert.equal(overlay.textBaseline, "middle");
    assert.equal(overlay.text, "测试字幕");
    assert.ok(overlay.font.startsWith("43px "));
    assert.equal(overlay.lineWidth, 5);
  });

  it("AC-2: top position places text near the top edge, well above bottom", () => {
    const top = computeTextOverlay({
      width: 1920,
      height: 1080,
      text: "测试字幕",
      position: "top",
      sizeRatio: 0.04,
    });

    assert.equal(top.y, 53.5);
    assert.ok(top.y < 1026.5);
  });

  it("AC-3: font size scales linearly with canvas height", () => {
    const overlay = computeTextOverlay({
      width: 1920,
      height: 2160,
      text: "x",
      position: "bottom",
      sizeRatio: 0.04,
    });

    assert.ok(overlay.font.startsWith("86px "));
    assert.equal(overlay.y, 2052);
  });
});

describe("drawTextOverlay", () => {
  it("AC-4: sets ctx properties, then strokes before filling with the overlay text", () => {
    const calls: string[] = [];
    const ctx: TextOverlayCtx = {
      font: "",
      textAlign: "start",
      textBaseline: "alphabetic",
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 0,
      strokeText: (text, x, y) => {
        calls.push(`stroke:${text}:${x}:${y}`);
      },
      fillText: (text, x, y) => {
        calls.push(`fill:${text}:${x}:${y}`);
      },
    };
    const overlay = computeTextOverlay({
      width: 1920,
      height: 1080,
      text: "测试字幕",
      position: "bottom",
      sizeRatio: 0.04,
    });

    drawTextOverlay(ctx, overlay);

    assert.equal(ctx.font, overlay.font);
    assert.equal(ctx.textAlign, overlay.textAlign);
    assert.equal(ctx.textBaseline, overlay.textBaseline);
    assert.equal(ctx.strokeStyle, overlay.stroke);
    assert.equal(ctx.fillStyle, overlay.color);
    assert.equal(ctx.lineWidth, overlay.lineWidth);
    const strokeCall = "stroke:测试字幕:960:1026.5";
    const fillCall = "fill:测试字幕:960:1026.5";
    assert.deepEqual(calls, [strokeCall, fillCall]);
  });
});

describe("shouldBurnOverlay", () => {
  it("AC-5: only true when enabled and text is non-blank", () => {
    assert.equal(shouldBurnOverlay(true, ""), false);
    assert.equal(shouldBurnOverlay(false, "abc"), false);
    assert.equal(shouldBurnOverlay(true, "  "), false);
    assert.equal(shouldBurnOverlay(true, "abc"), true);
  });
});
