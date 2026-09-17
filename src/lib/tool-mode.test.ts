import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveModeState, type ToolMode } from "./tool-mode";

const derive = (
  assetCount: number,
  processedCount: number,
  processing = false,
  progress?: { current: number; total: number },
) =>
  deriveModeState({ assetCount, processedCount, processing, progress });

describe("deriveModeState", () => {
  it("未导入时为 empty,只允许导入", () => {
    const state = derive(0, 0);
    assert.equal(state.mode, "empty");
    assert.equal(state.actions.canImport, true);
    // 导入前不应出现处理、清空、导出 —— interaction-modes 的
    // “选取文件前只有导入入口”场景
    assert.equal(state.actions.canRunPrimary, false);
    assert.equal(state.actions.canClear, false);
    assert.equal(state.actions.canDownload, false);
  });

  it("已导入未处理时为 ready,可处理可清空但不可导出", () => {
    const state = derive(3, 0);
    assert.equal(state.mode, "ready");
    assert.equal(state.actions.canRunPrimary, true);
    assert.equal(state.actions.canClear, true);
    assert.equal(state.actions.canDownload, false);
  });

  it("处理中为 processing,且不提供导入与清空(避免中途改变待处理集合)", () => {
    const state = derive(3, 1, true, { current: 2, total: 3 });
    assert.equal(state.mode, "processing");
    assert.equal(state.actions.canImport, false);
    assert.equal(state.actions.canClear, false);
    assert.equal(state.actions.canRunPrimary, false);
    assert.deepEqual(state.progress, { current: 2, total: 3 });
  });

  it("处理中未传进度时回退为 total = 对象数", () => {
    const state = derive(4, 0, true);
    assert.deepEqual(state.progress, { current: 0, total: 4 });
  });

  it("部分完成时为 partial,可导出且保留清空与重跑", () => {
    const state = derive(3, 1);
    assert.equal(state.mode, "partial");
    assert.equal(state.actions.canDownload, true);
    assert.equal(state.actions.canClear, true);
    assert.equal(state.actions.canImport, true);
  });

  it("全部完成时为 complete", () => {
    const state = derive(3, 3);
    assert.equal(state.mode, "complete");
    assert.equal(state.actions.canDownload, true);
  });

  it("模式可由输入完全枚举(不存在未覆盖组合)", () => {
    const seen = new Set<ToolMode>();
    for (const assetCount of [0, 1, 3]) {
      for (const processedCount of [0, 1, 3]) {
        for (const processing of [false, true]) {
          if (processedCount > assetCount) continue;
          seen.add(derive(assetCount, processedCount, processing).mode);
        }
      }
    }
    assert.deepEqual(
      [...seen].sort(),
      ["complete", "empty", "partial", "processing", "ready"],
      "五种模式均应由输入可达",
    );
  });

  it("处理中优先于其他判定(即使已有结果也不进入 partial)", () => {
    const state = derive(3, 2, true);
    assert.equal(state.mode, "processing");
  });
});
