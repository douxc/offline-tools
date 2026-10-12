import assert from "node:assert/strict";
import { isLocalizedError } from "@/lib/i18n/localized-error";
import { test } from "node:test";
import { encodePhoto, downloadPhotos, photoFileName } from "./id-photo-export";
import { PhotoBatch, activePhotoResults } from "./id-photo-state";

test("编码使用精确源区域和目标尺寸，体积增加也输出新结果", async () => {
  for (const mime of ["image/png", "image/jpeg", "image/webp"]) {
    const calls: unknown[][] = [];
    const context = { drawImage: (...args: unknown[]) => calls.push(args), imageSmoothingEnabled: false, imageSmoothingQuality: "low" };
    const blob = new Blob(["a much larger output"], { type: mime });
    const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback: (b: Blob) => void, type: string, quality?: number) => {
      assert.equal(canvas.width, 295); assert.equal(canvas.height, 413);
      assert.equal(type, mime); assert.equal(quality, mime === "image/png" ? undefined : 0.92);
      callback(blob);
    }} as unknown as HTMLCanvasElement;
    const output = await encodePhoto({} as CanvasImageSource, { x: 30, y: 10, width: 590, height: 826 }, { width: 295, height: 413 }, { name: "photo", type: mime }, 1, () => canvas);
    assert.deepEqual(calls[0].slice(1), [30, 10, 590, 826, 0, 0, 295, 413]);
    assert.equal(output.blob, blob);
    assert.equal(context.imageSmoothingQuality, "high");
    assert.equal(canvas.width, 0);
  }
});

test("空编码与格式回退拒绝提交并清理 Canvas", async () => {
  for (const blob of [null, new Blob(["fallback"], { type: "image/png" })]) {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => {} }), toBlob: (cb: (b: Blob | null) => void) => cb(blob) } as unknown as HTMLCanvasElement;
    await assert.rejects(
      encodePhoto({} as CanvasImageSource, { x: 0, y: 0, width: 800, height: 600 }, { width: 400, height: 300 }, { name: "a.webp", type: "image/webp" }, 1, () => canvas),
      // 纯函数抛**错误码**，由界面层翻译；这里断言码而不是某种语言的文案
      (error: unknown) =>
        isLocalizedError(error) &&
        ["err.idPhoto.encodeFailed", "err.idPhoto.unsupportedOutputFormat"].includes(error.code),
    );
    assert.equal(canvas.width, 0);
  }
});

test("下载按顺序，包含尺寸序号，空结果不下载且 URL 释放", () => {
  assert.equal(photoFileName("same.jpg", { width: 295, height: 413 }, 2, "image/jpeg"), "same_295x413_002.jpg");
  assert.equal(photoFileName("a/b.png", { width: 1, height: 2 }, 1, "image/png"), "a-b_1x2_001.png");
  const saved: string[] = [], released: string[] = [];
  const port = { createUrl: () => "blob:test", releaseUrl: (url: string) => released.push(url), save: (_url: string, name: string) => saved.push(name), later: (fn: () => void) => fn() };
  downloadPhotos([], port); assert.equal(saved.length, 0);
  downloadPhotos([1, 2].map(n => ({ blob: new Blob(), width: 295, height: 413, fileName: `photo-${n}` })), port);
  assert.deepEqual(saved, ["photo-1", "photo-2"]);
  assert.equal(released.length, 2);
});

test("有效结果统一用于计数和下载，逐张调整不影响其他结果", () => {
  const result = { blob: new Blob(), fileName: "a", width: 295, height: 413, context: "fixed:1", revision: 0 };
  const assets = [{ id: "a", revision: 1 }, { id: "b", revision: 0 }];
  assert.deepEqual(Object.keys(activePhotoResults(assets, { a: result, b: result }, "fixed:1")), ["b"]);
  assert.deepEqual(activePhotoResults(assets, { a: result, b: result }, "custom:2"), {});
});

test("批处理部分失败保留成功结果且不自动下载", async () => {
  const batch = new PhotoBatch();
  const output = await batch.run([1, 2, 3], async value => {
    if (value === 2) throw new Error("不支持放大");
    return value * 2;
  });
  assert.deepEqual(output.results.map(r => r.result), [2, 6]);
  assert.equal(output.failures[0].error, "不支持放大");
});

test("取消丢弃整批暂存，迟到回调不能覆盖重新开始的结果", async () => {
  const batch = new PhotoBatch();
  let finish: (value: number) => void = () => {};
  let started: () => void = () => {};
  const ready = new Promise<void>(resolve => { started = resolve; });
  const pending = batch.run([1, 2], async value => {
    if (value === 1) return 1;
    started();
    return new Promise<number>(resolve => { finish = resolve; });
  });
  await ready;
  batch.cancel();
  const fresh = await batch.run([3], async value => value);
  finish(2);
  const stale = await pending;
  assert.equal(stale.cancelled, true);
  assert.deepEqual(stale.results, []);
  assert.equal(batch.current(stale.id), false);
  assert.equal(batch.current(fresh.id), true);
  assert.deepEqual(fresh.results.map(r => r.result), [3]);
});
