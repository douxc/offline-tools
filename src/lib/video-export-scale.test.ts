import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeScaledDimensions } from "./video-export-scale";

describe("computeScaledDimensions", () => {
  it("AC-1: scales to target width keeping aspect ratio, floored", () => {
    assert.deepEqual(computeScaledDimensions(1920, 1080, 960), {
      width: 960,
      height: 540,
    });
  });

  it("AC-2: does not upscale when targetWidth >= originalWidth", () => {
    assert.deepEqual(computeScaledDimensions(1280, 720, 2000), {
      width: 1280,
      height: 720,
    });
  });

  it("AC-3: returns original size when targetWidth is undefined or 0", () => {
    assert.deepEqual(computeScaledDimensions(1920, 1080), {
      width: 1920,
      height: 1080,
    });
    assert.deepEqual(computeScaledDimensions(1920, 1080, 0), {
      width: 1920,
      height: 1080,
    });
  });
});
