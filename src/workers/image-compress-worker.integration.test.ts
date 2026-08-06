import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { deflateSync } from "node:zlib";

type CompressionResponse = {
  id: number;
  success: boolean;
  png?: ArrayBuffer;
  strategy?: string;
  originalSize?: number;
  outputSize?: number;
  quantizationAttempted?: boolean;
  quantizedCandidateSize?: number;
  quantizationError?: string;
  paletteLength?: number;
  error?: string;
};

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.byteLength);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(
    8 + data.byteLength,
    crc32(chunk.subarray(4, 8 + data.byteLength)),
  );
  return chunk;
};

const encodeRgbaPng = (
  width: number,
  height: number,
  pixel: (x: number, y: number) => readonly [number, number, number, number],
): Uint8Array => {
  const raw = new Uint8Array(height * (1 + width * 4));

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      raw.set(pixel(x, y), rowOffset + 1 + x * 4);
    }
  }

  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);

  const compressed = Uint8Array.from(deflateSync(raw, { level: 0 }));
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array()),
  ];
  const output = new Uint8Array(
    parts.reduce((size, part) => size + part.byteLength, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
};

const startCodecWorker = async (): Promise<Worker> => {
  const workerBundle = await readFile(
    new URL("../../public/assets/image-compress-worker.js", import.meta.url),
    "utf8",
  );
  const harness = `
    const { parentPort } = require("node:worker_threads");
    globalThis.postMessage = (message, transfer) => parentPort.postMessage(message, transfer);
    parentPort.on("message", (data) => globalThis.onmessage({ data }));
  `;
  return new Worker(harness + workerBundle, { eval: true });
};

const sendRequest = async (
  worker: Worker,
  id: number,
  input: Uint8Array,
): Promise<CompressionResponse> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("图片编解码 Worker 超时")),
      20_000,
    );
    worker.once("error", reject);
    worker.once("message", (message: CompressionResponse) => {
      clearTimeout(timeout);
      resolve(message);
    });
    const png = Uint8Array.from(input).buffer;
    worker.postMessage(
      { id, action: "compress-png", png, quality: 82 },
      [png],
    );
  });

test("real libimagequant and OxiPNG WASM pipeline compresses PNG", async () => {
  const worker = await startCodecWorker();
  try {
    let random = 0x12345678;
    const input = encodeRgbaPng(128, 128, () => {
      random = (random * 1664525 + 1013904223) >>> 0;
      const color = random % 300;
      return [
        (color % 20) * 12,
        (Math.floor(color / 20) % 15) * 16,
        ((color * 13) % 32) * 8,
        255,
      ];
    });
    const response = await sendRequest(worker, 1, input);

    assert.equal(response.success, true, response.error);
    assert.equal(response.quantizationAttempted, true);
    assert.equal(response.quantizationError, undefined);
    assert.notEqual(response.quantizedCandidateSize, undefined);
    assert.ok(
      response.strategy === "oxipng" ||
        response.strategy === "libimagequant-oxipng",
    );
    assert.ok((response.outputSize ?? input.byteLength) < input.byteLength);
    assert.ok((response.paletteLength ?? 257) <= 192);
    const output = new Uint8Array(response.png ?? new ArrayBuffer(0));
    assert.deepEqual(Array.from(output.subarray(0, 8)), [
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  } finally {
    await worker.terminate();
  }
});

test("continuous-tone PNG takes the lossless OxiPNG path", async () => {
  const worker = await startCodecWorker();
  try {
    const input = encodeRgbaPng(256, 256, (x, y) => [
      x,
      y,
      (x * 3 + y * 5) % 256,
      255,
    ]);
    const response = await sendRequest(worker, 2, input);

    assert.equal(response.success, true, response.error);
    assert.equal(response.quantizationAttempted, false);
    assert.equal(response.strategy, "oxipng");
    assert.ok((response.outputSize ?? input.byteLength) < input.byteLength);
  } finally {
    await worker.terminate();
  }
});
