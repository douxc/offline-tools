import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("分段控件暴露 aria-pressed 选中语义（不依赖颜色）", async () => {
  const app = await readFile(new URL("src/App.tsx", root), "utf8");
  const overlay = await readFile(
    new URL("src/components/text-overlay-panel.tsx", root),
    "utf8",
  );

  assert.match(app, /aria-pressed=\{format === item\}/);
  assert.match(overlay, /aria-pressed=\{position === item\.value\}/);
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
