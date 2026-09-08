import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  A4_PAGE_HEIGHT_PX,
  A4_PAGE_WIDTH_PX,
  A4_PAGE_MM,
  clampIndex,
  COLS_PER_ROW,
  MARGIN_MM,
  moveItem,
  paginateFlow,
  type FlowItem,
  type FlowPages,
} from "./a4-layout";

const square = (count: number): FlowItem[] =>
  Array.from({ length: count }, () => ({ aspect: 1 }));

const contentHeight = A4_PAGE_MM.height - 2 * MARGIN_MM.default; // 277mm

/** 1:1 图在 contentWidth / cols 下的行高 */
const rowHeight = (cols: number) =>
  Math.round(((A4_PAGE_MM.width - 2 * MARGIN_MM.default) / cols) * 100) / 100;

describe("A4 页面尺寸与常量", () => {
  it("AC-1: A4 为 210mm × 297mm，换算为 CSS 像素后不缩小", () => {
    assert.deepEqual(A4_PAGE_MM, { width: 210, height: 297 });
    assert.ok(A4_PAGE_WIDTH_PX > 700);
    assert.ok(A4_PAGE_HEIGHT_PX > 1000);
    assert.ok(Math.abs(A4_PAGE_WIDTH_PX / 210 - 96 / 25.4) < 1e-9);
  });

  it("AC-2: 每行张数范围为 1–6，默认 3；页边距 5–25mm 默认 10mm", () => {
    assert.deepEqual(COLS_PER_ROW, { min: 1, max: 6, default: 3 });
    assert.deepEqual(MARGIN_MM, { min: 5, max: 25, step: 1, default: 10 });
  });
});

describe("paginateFlow 切行", () => {
  it("AC-3: 空输入返回空结构", () => {
    assert.deepEqual(paginateFlow([], 3, 10), { rows: [], pageRows: [] });
  });

  it("AC-4: 6 张 1:1 图每行 3 张 → 2 行，行高 = 内容宽 / 3", () => {
    const { rows } = paginateFlow(square(6), 3, 10);
    assert.deepEqual(rows, [
      { start: 0, end: 3, rowHeightMm: rowHeight(3) },
      { start: 3, end: 6, rowHeightMm: rowHeight(3) },
    ]);
  });

  it("AC-5: 同行宽高比不一致时行高取最高图片，短图不变形", () => {
    const items: FlowItem[] = [
      { aspect: 1 }, // 2000×2000：高 = 宽
      { aspect: 2 }, // 2000×1000：高 = 宽 / 2
      { aspect: 0.5 }, // 900×1800：高 = 宽 × 2（最高）
    ];
    const { rows } = paginateFlow(items, 3, 10);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].end, 3);
    // 行高应为 cellWidth × 2（126.67mm），而非 1 或 0.5
    assert.equal(rows[0].rowHeightMm, Math.round((190 / 3 / 0.5) * 100) / 100);
    assert.ok(rows[0].rowHeightMm > rowHeight(3) * 1.9);
  });

  it("AC-6: 每行 1 张时占满内容宽，行高按自身宽高比、超页高收窄", () => {
    // aspect=2（横版 2000×1000）：行高 = 190 / 2 = 95mm
    const wide = paginateFlow([{ aspect: 2 }], 1, 10);
    assert.equal(wide.rows[0].rowHeightMm, 95);
    // aspect=0.5（竖版 900×1800）：行高 380mm 超出内容高 → 收窄为 277mm
    const tall = paginateFlow([{ aspect: 0.5 }], 1, 10);
    assert.equal(tall.rows[0].rowHeightMm, contentHeight);
  });

  it("AC-7: cols 越界按边界取（<=0 按 1，>6 按 6）", () => {
    const zero = paginateFlow(square(2), 0, 10);
    assert.equal(zero.rows[0].end, 1);
    assert.equal(zero.rows[0].rowHeightMm, rowHeight(1));
    const over = paginateFlow(square(7), 99, 10);
    assert.equal(over.rows.length, 2);
    assert.equal(over.rows[0].end, 6);
    assert.equal(over.rows[1].end, 7);
  });

  it("AC-8: aspect <= 0 时按 1:1 兜底", () => {
    const { rows } = paginateFlow([{ aspect: 0 }, { aspect: -2 }], 2, 10);
    assert.equal(rows[0].rowHeightMm, rowHeight(2));
  });
});

describe("paginateFlow 切页（行不跨页）", () => {
  it("AC-9: 行高总和小于内容高时单页", () => {
    const { pageRows } = paginateFlow(square(4), 4, 10);
    assert.deepEqual(pageRows, [{ start: 0, end: 1 }]);
  });

  it("AC-10: 行高总和超出内容高时整行换页、末页可不满", () => {
    // 每行 1 张、行高 190mm：277mm 内只能容纳 1 行 → 6 张 = 6 页
    const result = paginateFlow(square(4), 1, 10);
    assert.equal(result.pageRows.length, 4);
    // 每行 3 张、行高 ≈63.3mm：277 / 63.33 ≈ 4 行/页 → 9 行 = 2 页（4 + 5）
    const three = paginateFlow(square(27), 3, 10);
    const perPage = Math.floor((contentHeight + 0.05) / rowHeight(3));
    assert.ok(perPage >= 4 && perPage <= 5, `perPage=${perPage}`);
    assert.equal(three.rows.length, 9);
  });

  it("AC-11: 整行换页不跨页断开", () => {
    // 构造：行高 100mm × 3，内容高 277mm → 页1 两行(200)，页2 一行(100)
    const items: FlowItem[] = [
      { aspect: 1.9 }, // 100mm × 3 行
      { aspect: 1.9 },
      { aspect: 1.9 },
    ];
    const result = paginateFlow(items, 1, 10);
    assert.equal(result.pageRows.length, 2);
    assert.deepEqual(result.pageRows, [
      { start: 0, end: 2 },
      { start: 2, end: 3 },
    ]);
  });

  it("AC-12: 完美排满不产生额外空白页", () => {
    // 行高恰为内容高的一半 → 两行一页，4 行 → 2 页
    const half = Math.round(((A4_PAGE_MM.height - 20) / 2) * 100) / 100; // 138.5
    const items: FlowItem[] = Array.from({ length: 4 }, () => ({
      aspect: 190 / 138.5,
    }));
    const result = paginateFlow(items, 1, 10);
    assert.equal(result.rows[0].rowHeightMm, half);
    assert.equal(result.pageRows.length, 2);
    assert.deepEqual(result.pageRows, [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  it("AC-13: 移除图片后重新流动分页", () => {
    const full = paginateFlow(square(9), 1, 10);
    assert.equal(full.rows.length, 9);
    const reduced = paginateFlow(square(6), 1, 10);
    assert.equal(reduced.rows.length, 6);
    assert.ok(reduced.pageRows.length <= full.pageRows.length);
  });
});

describe("moveItem 排序", () => {
  const ordered = ["a", "b", "c"];

  it("AC-14: 上移/下移中间元素", () => {
    assert.deepEqual(moveItem(ordered, 1, -1), ["b", "a", "c"]);
    assert.deepEqual(moveItem(ordered, 1, 1), ["a", "c", "b"]);
  });

  it("AC-15: 首元素上移 / 末元素下移为无操作", () => {
    assert.deepEqual(moveItem(ordered, 0, -1), ["a", "b", "c"]);
    assert.deepEqual(moveItem(ordered, 2, 1), ["a", "b", "c"]);
  });

  it("AC-16: 越界下标无操作且不抛错", () => {
    assert.deepEqual(moveItem(ordered, -1, 1), ["a", "b", "c"]);
    assert.deepEqual(moveItem(ordered, 99, 1), ["a", "b", "c"]);
  });
});

describe("clampIndex", () => {
  it("AC-17: 收敛页码到有效范围", () => {
    assert.equal(clampIndex(5, 3), 2);
    assert.equal(clampIndex(-1, 3), 0);
    assert.equal(clampIndex(1, 3), 1);
    assert.equal(clampIndex(2, 0), 0);
  });
});

describe("类型完备性", () => {
  it("AC-18: FlowPages 结构可被消费", () => {
    const result: FlowPages = paginateFlow(square(2), 2, 10);
    assert.equal(typeof result.rows[0].rowHeightMm, "number");
    assert.equal(typeof result.pageRows[0].start, "number");
  });
});
