import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 取消契约守卫(Apple 交互契约 / interaction-modes)。
 *
 * 「取消进行中的操作 → 停止处理、保持上下文、不产出半成品」这条要求依赖三处
 * 取消路径各自保留守卫。守卫很容易在重构中被顺手删掉,而删除后不会立刻暴露
 * 症状(要等到用户取消并拿到半成品文件)。本文件把守卫钉住。
 */

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

/** 三处可取消的耗时操作及其守卫标记 / 取消入口。 */
const CANCEL_SITES = [
  {
    name: "图片批量处理",
    path: "src/tools/image-processor/ImageProcessor.tsx",
    guard: "cancelProcessingRef.current",
    entry: "停止处理",
    // 取消后必须保留已完成结果,而不是整体丢弃
    keepsPartial: "已完成的图片保留在列表中",
  },
  {
    name: "批量抽帧导出",
    path: "src/App.tsx",
    guard: "cancelBatchRef.current",
    entry: "停止导出",
    keepsPartial: "未产生 ZIP 文件",
  },
  {
    name: "视频压缩录制",
    path: "src/components/video-compressor.tsx",
    guard: "discardRef.current",
    entry: "停止压缩",
    keepsPartial: "已取消压缩",
  },
];

for (const site of CANCEL_SITES) {
  test(`${site.name}:提供取消入口且保留不产出半成品的守卫`, async () => {
    const source = await readSource(site.path);
    assert.ok(
      source.includes(site.entry),
      `${site.name} 应提供「${site.entry}」取消入口`,
    );
    assert.ok(
      source.includes(site.guard),
      `${site.name} 应保留取消守卫 ${site.guard}`,
    );
    assert.ok(
      source.includes(site.keepsPartial),
      `${site.name} 的取消提示应说明未产生文件/已保留的内容(失败恢复契约)`,
    );
  });
}

test("三处取消入口均在主操作同一槽位提供(不新增进度行)", async () => {
  const files = [
    "src/tools/image-processor/ImageProcessor.tsx",
    "src/App.tsx",
    "src/components/video-compressor.tsx",
  ];
  for (const path of files) {
    const source = await readSource(path);
    assert.doesNotMatch(
      source,
      /<progress\b/,
      `${path} 不应使用独立 <progress> 元素呈现进度`,
    );
  }
});
