import assert from "node:assert/strict";
import test from "node:test";
import { analyzePngPixels, choosePngCompressionPlan } from "./png-strategy";

const createPixels = (
  width: number,
  height: number,
  pixel: (x: number, y: number) => readonly [number, number, number, number],
): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      pixels.set(pixel(x, y), (y * width + x) * 4);
    }
  }
  return pixels;
};

test("flat graphics use palette quantization", () => {
  const pixels = createPixels(64, 64, (x, y) =>
    (x + y) % 2 === 0
      ? [20, 40, 60, 255]
      : [240, 220, 180, 255],
  );
  const analysis = analyzePngPixels(pixels, 64, 64);
  const plan = choosePngCompressionPlan(analysis, 80);

  assert.equal(analysis.colorBuckets, 2);
  assert.equal(plan.mode, "quantized");
  assert.equal(plan.maxColors, 192);
});

test("continuous-tone images stay lossless", () => {
  const pixels = createPixels(256, 256, (x, y) => [
    x,
    y,
    (x * 3 + y * 5) % 256,
    255,
  ]);
  const analysis = analyzePngPixels(pixels, 256, 256);
  const plan = choosePngCompressionPlan(analysis, 80);

  assert.ok(analysis.colorBuckets > 1_100);
  assert.ok(analysis.edgeRatio < 0.12);
  assert.equal(plan.mode, "lossless");
  assert.equal(plan.reason, "continuous-tone");
});

test("transparent artwork uses palette quantization", () => {
  const pixels = createPixels(128, 128, (x, y) => [
    x * 2,
    y * 2,
    160,
    (x + y) % 5 === 0 ? 0 : 255,
  ]);
  const analysis = analyzePngPixels(pixels, 128, 128);
  const plan = choosePngCompressionPlan(analysis, 92);

  assert.ok(analysis.transparentPixelRatio > 0.01);
  assert.equal(plan.mode, "quantized");
  assert.equal(plan.reason, "transparent-graphics");
  assert.equal(plan.maxColors, 256);
});

test("invalid pixel buffers return an empty analysis", () => {
  assert.deepEqual(analyzePngPixels(new Uint8ClampedArray(3), 10, 10), {
    sampledPixels: 0,
    colorBuckets: 0,
    colorBucketRatio: 0,
    transparentPixelRatio: 0,
    edgeRatio: 0,
  });
});
