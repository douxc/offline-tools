export type PngAnalysis = {
  sampledPixels: number;
  colorBuckets: number;
  colorBucketRatio: number;
  transparentPixelRatio: number;
  edgeRatio: number;
};

export type PngCompressionPlan = {
  mode: "lossless" | "quantized";
  reason:
    | "limited-colors"
    | "graphics"
    | "transparent-graphics"
    | "low-quality"
    | "continuous-tone";
  maxColors: number;
  minimumQuality: number;
  targetQuality: number;
  dithering: number;
};

const MAX_SAMPLED_PIXELS = 65_536;
const MAX_COLOR_BUCKETS = 8_192;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const analyzePngPixels = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): PngAnalysis => {
  const pixelCount = width * height;
  if (pixelCount === 0 || rgba.length < pixelCount * 4) {
    return {
      sampledPixels: 0,
      colorBuckets: 0,
      colorBucketRatio: 0,
      transparentPixelRatio: 0,
      edgeRatio: 0,
    };
  }

  const stride = Math.max(
    1,
    Math.ceil(Math.sqrt(pixelCount / MAX_SAMPLED_PIXELS)),
  );
  const buckets = new Set<number>();
  let sampledPixels = 0;
  let transparentPixels = 0;
  let edgeSamples = 0;
  let edgePixels = 0;

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const offset = (y * width + x) * 4;
      const red = rgba[offset];
      const green = rgba[offset + 1];
      const blue = rgba[offset + 2];
      const alpha = rgba[offset + 3];

      sampledPixels += 1;
      if (alpha < 250) transparentPixels += 1;

      if (buckets.size < MAX_COLOR_BUCKETS) {
        const bucket =
          ((red >> 3) << 15) |
          ((green >> 3) << 10) |
          ((blue >> 3) << 5) |
          (alpha >> 3);
        buckets.add(bucket);
      }

      if (x >= stride) {
        const previousOffset = (y * width + x - stride) * 4;
        const difference =
          Math.abs(red - rgba[previousOffset]) +
          Math.abs(green - rgba[previousOffset + 1]) +
          Math.abs(blue - rgba[previousOffset + 2]) +
          Math.abs(alpha - rgba[previousOffset + 3]) * 0.5;
        edgeSamples += 1;
        if (difference >= 96) edgePixels += 1;
      }

      if (y >= stride) {
        const previousOffset = ((y - stride) * width + x) * 4;
        const difference =
          Math.abs(red - rgba[previousOffset]) +
          Math.abs(green - rgba[previousOffset + 1]) +
          Math.abs(blue - rgba[previousOffset + 2]) +
          Math.abs(alpha - rgba[previousOffset + 3]) * 0.5;
        edgeSamples += 1;
        if (difference >= 96) edgePixels += 1;
      }
    }
  }

  return {
    sampledPixels,
    colorBuckets: buckets.size,
    colorBucketRatio: sampledPixels === 0 ? 0 : buckets.size / sampledPixels,
    transparentPixelRatio:
      sampledPixels === 0 ? 0 : transparentPixels / sampledPixels,
    edgeRatio: edgeSamples === 0 ? 0 : edgePixels / edgeSamples,
  };
};

export const choosePngCompressionPlan = (
  analysis: PngAnalysis,
  requestedQuality: number,
): PngCompressionPlan => {
  const quality = Math.round(clamp(requestedQuality, 10, 100));
  const maxColors =
    quality >= 90 ? 256 : quality >= 75 ? 192 : quality >= 55 ? 128 : 64;
  const minimumQuality = 0;
  const targetQuality = Math.max(50, quality);

  const hasLimitedColors =
    analysis.colorBuckets <= 320 ||
    (analysis.colorBuckets <= 700 && analysis.colorBucketRatio <= 0.025);
  const looksLikeGraphics =
    analysis.colorBuckets <= 1_100 && analysis.edgeRatio >= 0.12;
  const looksLikeTransparentGraphics =
    analysis.transparentPixelRatio >= 0.01 &&
    analysis.colorBuckets <= 2_500;
  const acceptsAggressiveCompression =
    quality <= 65 && analysis.colorBuckets <= 4_000;

  let reason: PngCompressionPlan["reason"] = "continuous-tone";
  if (hasLimitedColors) reason = "limited-colors";
  else if (looksLikeTransparentGraphics) reason = "transparent-graphics";
  else if (looksLikeGraphics) reason = "graphics";
  else if (acceptsAggressiveCompression) reason = "low-quality";

  const mode = reason === "continuous-tone" ? "lossless" : "quantized";
  const dithering =
    analysis.colorBuckets <= maxColors
      ? 0
      : analysis.edgeRatio >= 0.18
        ? 0.35
        : 0.8;

  return {
    mode,
    reason,
    maxColors,
    minimumQuality,
    targetQuality,
    dithering,
  };
};
