import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("分段控件由 shadcn ToggleGroup 承载并暴露选中语义", async () => {
  // 分段控件统一使用 ToggleGroup,选中态由 Radix 单选组的 role=radio +
  // aria-checked 表达(Radix 对 single 型会以 aria-checked 取代 aria-pressed)
  const app = await readFile(new URL("src/App.tsx", root), "utf8");
  const overlay = await readFile(
    new URL("src/components/text-overlay-panel.tsx", root),
    "utf8",
  );
  const a4 = await readFile(
    new URL("src/tools/image-a4-layout/A4ImageLayout.tsx", root),
    "utf8",
  );
  const batch = await readFile(
    new URL("src/components/batch-sampling-controls.tsx", root),
    "utf8",
  );

  for (const [name, source] of [
    ["App.tsx", app],
    ["text-overlay-panel.tsx", overlay],
    ["A4ImageLayout.tsx", a4],
    ["batch-sampling-controls.tsx", batch],
  ]) {
    assert.match(source, /ToggleGroup/, `${name} 应使用 shadcn ToggleGroup`);
    assert.doesNotMatch(
      source,
      /className=\{[^}]*"active"/,
      `${name} 不应使用自建 active 类表达分段选中态`,
    );
  }
});

test("图片列表选中项暴露选中语义", async () => {
  const imageProcessor = await readFile(
    new URL("src/tools/image-processor/ImageProcessor.tsx", root),
    "utf8",
  );
  assert.match(
    imageProcessor,
    /aria-pressed=\{selected\?\.id === asset\.id\}/,
  );
});

test("分组导航当前页由 aria-current 标记（ToolHeader）", async () => {
  const toolHeader = await readFile(
    new URL("src/components/tool-header.tsx", root),
    "utf8",
  );

  assert.match(toolHeader, /aria-current=\{isCurrent \? "page" : undefined\}/);
});
