import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import {
  BATCH_DECODE_CONCURRENCY,
  createFrameZipArchive,
  frameFileName,
} from "./zip-packer";

describe("createFrameZipArchive", () => {
  it("AC-7: returns a Blob typed application/zip with non-zero size", async () => {
    const blob = await createFrameZipArchive([
      { name: "a.txt", data: new Uint8Array([1, 2, 3]) },
    ]);
    assert.equal(blob.type, "application/zip");
    assert.ok(blob.size > 0);
  });

  it("AC-8: round-trips entries through jszip with identical bytes", async () => {
    const blob = await createFrameZipArchive([
      { name: "frame_000.png", data: new Uint8Array([10, 20, 30]) },
    ]);
    const buf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const entry = zip.file("frame_000.png");
    assert.ok(entry);
    const bytes = await entry.async("uint8array");
    assert.deepEqual(bytes, new Uint8Array([10, 20, 30]));
  });
});

describe("BATCH_DECODE_CONCURRENCY", () => {
  it("AC-9: serial decode for the first batch (concurrency === 1)", () => {
    assert.equal(BATCH_DECODE_CONCURRENCY, 1);
  });
});

describe("frameFileName", () => {
  it("AC-10: zero-pads index to 3 digits and joins with extension", () => {
    assert.equal(frameFileName("clip", 0, "png"), "clip_000.png");
    assert.equal(frameFileName("clip", 42, "jpg"), "clip_042.jpg");
  });
});
