import * as imageQuantWasm from "libimagequant-wasm/wasm/libimagequant_wasm.js";
import imageQuantWasmBytes from "libimagequant-wasm/wasm/libimagequant_wasm_bg.wasm";
import initOxiPng, {
  optimise as optimisePng,
} from "@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";
// @ts-expect-error esbuild's binary loader replaces this WASM module with a Uint8Array.
import oxiPngWasmBytes from "@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm";
import {
  analyzePngPixels,
  choosePngCompressionPlan,
} from "../lib/png-strategy";

type CompressRequest = {
  id: number;
  action: "compress-png";
  png: ArrayBuffer;
  quality: number;
};

type CompressionStrategy = "original" | "oxipng" | "libimagequant-oxipng";

type CompressResponse =
  | {
      id: number;
      success: true;
      png: ArrayBuffer;
      strategy: CompressionStrategy;
      planReason: string;
      originalSize: number;
      outputSize: number;
      width: number;
      height: number;
      quantizationAttempted: boolean;
      quantizedCandidateSize?: number;
      quantizationError?: string;
      paletteLength?: number;
      achievedQuality?: number;
    }
  | {
      id: number;
      success: false;
      error: string;
    };

type WorkerScope = {
  onmessage: ((event: MessageEvent<CompressRequest>) => void) | null;
  postMessage: (message: CompressResponse, transfer?: Transferable[]) => void;
};

const workerScope = globalThis as unknown as WorkerScope;
let initialization: Promise<void> | undefined;

const initializeCodecs = async (): Promise<void> => {
  if (!initialization) {
    initialization = Promise.all([
      imageQuantWasm.default({ module_or_path: imageQuantWasmBytes }),
      initOxiPng(oxiPngWasmBytes),
    ]).then(() => undefined);
  }
  await initialization;
};

const isPng = (bytes: Uint8Array): boolean =>
  bytes.length >= 8 &&
  bytes[0] === 0x89 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x4e &&
  bytes[3] === 0x47 &&
  bytes[4] === 0x0d &&
  bytes[5] === 0x0a &&
  bytes[6] === 0x1a &&
  bytes[7] === 0x0a;

const copyBuffer = (bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer =>
  Uint8Array.from(bytes).buffer;

const compressPng = async (
  request: CompressRequest,
): Promise<CompressResponse> => {
  const original = new Uint8Array(request.png);
  if (!isPng(original)) {
    throw new Error("所选文件不是有效的 PNG 图片");
  }

  await initializeCodecs();

  const [rgba, width, height] = imageQuantWasm.decode_png_to_rgba(original) as [
    Uint8ClampedArray,
    number,
    number,
  ];
  const analysis = analyzePngPixels(rgba, width, height);
  const plan = choosePngCompressionPlan(analysis, request.quality);

  let bestBytes: Uint8Array<ArrayBufferLike> = original;
  let strategy: CompressionStrategy = "original";

  try {
    const lossless = optimisePng(original, 3, false, true);
    if (lossless.byteLength < bestBytes.byteLength) {
      bestBytes = lossless;
      strategy = "oxipng";
    }
  } catch {
    // Keep the valid original if OxiPNG rejects an uncommon PNG chunk layout.
  }

  let paletteLength: number | undefined;
  let achievedQuality: number | undefined;
  let quantizedCandidateSize: number | undefined;
  let quantizationError: string | undefined;

  if (plan.mode === "quantized") {
    try {
      const imageQuantizer = new imageQuantWasm.ImageQuantizer();
      let quantizedBytes: Uint8Array;
      try {
        imageQuantizer.setSpeed(4);
        imageQuantizer.setQuality(plan.minimumQuality, plan.targetQuality);
        imageQuantizer.setMaxColors(plan.maxColors);
        const quantized = imageQuantizer.quantizeImage(rgba, width, height);
        try {
          const palette = quantized.getPalette();
          paletteLength = quantized.getPaletteLength();
          achievedQuality = quantized.getQuantizationQuality();
          quantized.setDithering(plan.dithering);
          const paletteIndices = quantized.getPaletteIndices(
            rgba,
            width,
            height,
          );
          quantizedBytes = imageQuantWasm.encode_palette_to_png(
            paletteIndices,
            palette,
            width,
            height,
          );
        } finally {
          quantized.free();
        }
      } finally {
        imageQuantizer.free();
      }

      const quantizedAndOptimized = optimisePng(
        quantizedBytes,
        3,
        false,
        true,
      );
      quantizedCandidateSize = quantizedAndOptimized.byteLength;

      if (quantizedAndOptimized.byteLength < bestBytes.byteLength) {
        bestBytes = quantizedAndOptimized;
        strategy = "libimagequant-oxipng";
      }
    } catch (error: unknown) {
      quantizationError =
        error instanceof Error ? error.message : String(error);
    }
  }

  const output = copyBuffer(bestBytes);
  return {
    id: request.id,
    success: true,
    png: output,
    strategy,
    planReason: plan.reason,
    originalSize: original.byteLength,
    outputSize: output.byteLength,
    width,
    height,
    quantizationAttempted: plan.mode === "quantized",
    quantizedCandidateSize,
    quantizationError,
    paletteLength,
    achievedQuality,
  };
};

workerScope.onmessage = (event): void => {
  const request = event.data;
  if (request.action !== "compress-png") return;

  void compressPng(request)
    .then((response) => {
      if (!response.success) return;
      workerScope.postMessage(response, [response.png]);
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : "PNG 压缩失败",
      });
    });
};
