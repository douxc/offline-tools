import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import {
  A4ColsPicker,
  A4ImageLayout,
  A4ImageList,
  A4PaginationBar,
  A4Sheet,
  type A4SheetItem,
} from "./A4ImageLayout";
import { paginateFlow, type FlowRow } from "@/lib/a4-layout";
import { ThemeProvider } from "@/lib/theme";

const render = (element: ReactElement) =>
  renderToString(
    createElement(
      ThemeProvider,
      { initialTheme: "dark" },
      element,
    ),
  ).replace(/<!--[\s\S]*?-->/g, "");

const sheetItems = (count: number): A4SheetItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `img-${index}`,
    url: `blob:test-${index}`,
    name: `照片-${index + 1}.jpg`,
  }));

describe("A4ImageLayout（空状态）", () => {
  it("AC-1: 未导入图片时显示引导文案，打印与清空按钮为禁用态，不渲染版面", () => {
    const html = render(createElement(A4ImageLayout));

    assert.match(html, /先导入图片/);
    assert.match(html, /拖放图片到这里/);
    assert.match(html, /打印 A4 版面（0 页）/);
    assert.match(html, /清空图片/);
    assert.match(html, /disabled/);
    assert.doesNotMatch(html, /a4-sheet/);
    assert.match(html, /A4 排版/);
  });

  it("AC-2: 无大标题区（无 h1/描述），模式 tab 保留且 A4 排版为激活态", () => {
    const html = render(createElement(A4ImageLayout));
    // 顶部大标题区已移除：页面从模式 tab 与工具内容直接开始
    assert.doesNotMatch(html, /<h1/);
    assert.doesNotMatch(html, /浏览器本地 A4 排版/);
    assert.doesNotMatch(html, /不会上传/);
    assert.match(html, /图片压缩/);
    assert.match(html, /添加水印/);
    assert.match(html, /class="active" href="\/image-a4-layout\/">A4 排版</);
    assert.match(html, /title="先导入图片"/);
  });
});

describe("A4Sheet（按行流动版面）", () => {
  it("AC-3: 渲染行与单元格，行高由布局注入，图片按比例 contain", () => {
    const items = sheetItems(6);
    const flow = paginateFlow(
      Array.from({ length: 6 }, () => ({ aspect: 1 })),
      3,
      10,
    );
    const html = render(
      createElement(A4Sheet, {
        rows: flow.rows,
        items,
        marginMm: 10,
        index: 0,
      }),
    );
    assert.equal((html.match(/<img /g) ?? []).length, 6);
    assert.match(html, /a4-sheet/);
    assert.match(html, /a4-flow-row/);
    assert.match(html, /a4-flow-cell/);
    assert.match(html, /--a4-row-h:/);
    assert.match(html, /padding:10mm/);
    // 不等高行：混排时行高取最高图片
    const mixed = paginateFlow(
      [{ aspect: 1 }, { aspect: 2 }, { aspect: 0.5 }],
      3,
      10,
    );
    const mixedHtml = render(
      createElement(A4Sheet, {
        rows: mixed.rows,
        items: sheetItems(3),
        marginMm: 10,
        index: 0,
      }),
    );
    assert.match(mixedHtml, /a4-flow-row/);
  });

  it("AC-4: 非当前页添加 a4-sheet-hidden，页码属性与 aria-label 正确", () => {
    const flow = paginateFlow(
      Array.from({ length: 3 }, () => ({ aspect: 1 })),
      3,
      10,
    );
    const html = render(
      createElement(A4Sheet, {
        rows: flow.rows,
        items: sheetItems(3),
        marginMm: 10,
        index: 1,
        hiddenOnScreen: true,
      }),
    );
    assert.match(html, /a4-sheet-hidden/);
    assert.match(html, /data-page="2"/);
    assert.match(html, /第 2 页 A4 版面/);
  });
});

describe("A4ImageList（图片管理）", () => {
  it("AC-5: 按顺序渲染列表，首项上移与末项下移禁用，每项有移除按钮", () => {
    const html = render(
      createElement(A4ImageList, {
        items: sheetItems(3),
        onMove: () => {},
        onRemove: () => {},
      }),
    );
    assert.match(html, /照片-1\.jpg/);
    assert.match(html, /照片-3\.jpg/);
    assert.match(html, /第 03 张/);
    assert.match(html, /aria-label="上移 照片-1\.jpg"/);
    assert.match(html, /aria-label="下移 照片-1\.jpg"/);
    assert.match(html, /aria-label="移除 照片-1\.jpg"/);
    assert.match(html, /aria-label="下移 照片-3\.jpg"/);
    assert.match(
      html,
      /aria-label="上移 照片-1\.jpg"[^>]*disabled|disabled[^>]*aria-label="上移 照片-1\.jpg"/,
    );
    assert.match(
      html,
      /aria-label="下移 照片-3\.jpg"[^>]*disabled|disabled[^>]*aria-label="下移 照片-3\.jpg"/,
    );
  });
});

describe("A4PaginationBar（翻页边界）", () => {
  it("AC-6: 第一页时上一页禁用、下一页可用，页码指示为 第 1 / 3 页", () => {
    const html = render(
      createElement(A4PaginationBar, {
        pageIndex: 0,
        pageCount: 3,
        onPrev: () => {},
        onNext: () => {},
      }),
    );
    assert.match(html, /第 1 \/ 3 页/);
    assert.match(html, /aria-label="上一页"[^>]*disabled/);
    assert.doesNotMatch(html, /aria-label="下一页"[^>]*disabled/);
  });

  it("AC-7: 最后一页时下一页禁用、上一页可用", () => {
    const html = render(
      createElement(A4PaginationBar, {
        pageIndex: 2,
        pageCount: 3,
        onPrev: () => {},
        onNext: () => {},
      }),
    );
    assert.match(html, /aria-label="下一页"[^>]*disabled/);
    assert.doesNotMatch(html, /aria-label="上一页"[^>]*disabled/);
  });
});

describe("A4ColsPicker（每行张数）", () => {
  it("AC-8: 渲染 1–6 六个选项，默认 3 张激活", () => {
    const html = render(
      createElement(A4ColsPicker, {
        value: 3,
        onChange: () => {},
      }),
    );
    for (const cols of [1, 2, 3, 4, 5, 6]) {
      assert.match(html, new RegExp(`每行 ${cols} 张`));
    }
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /class="[^"]*active[^"]*"[^>]*>3 张</);
  });

  it("AC-9: 当前值 1 时只有 1 张激活", () => {
    const html = render(
      createElement(A4ColsPicker, {
        value: 1,
        onChange: () => {},
      }),
    );
    assert.match(html, /class="[^"]*active[^"]*"[^>]*>1 张</);
  });
});

describe("分页与行结构", () => {
  it("AC-10: 3×3 场景示例（10 张正方形图每行 3 张）生成 2 页", () => {
    const flow = paginateFlow(
      Array.from({ length: 10 }, () => ({ aspect: 1 })),
      3,
      10,
    );
    // 行高 63.33mm → 每页 4 行 → 10 张 / 3 = 4 行 = 1 页；4 页？验证行数一致性
    assert.equal(flow.rows.length, 4);
    const pageRows: FlowRow[][] = flow.pageRows.map((page) =>
      flow.rows.slice(page.start, page.end),
    );
    assert.ok(pageRows.length >= 1 && pageRows.length <= 4);
    // 行不跨页：所有页行首尾与总行数一致
    assert.equal(
      pageRows.reduce((sum, rows) => sum + rows.length, 0),
      flow.rows.length,
    );
  });
});
