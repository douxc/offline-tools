import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 稳定锚点的结构回归守卫(Apple 交互契约 / interaction-modes)。
 *
 * 完整的几何断言(锚点矩形位移 ≤1px)需要浏览器测量,当前环境不安装无头浏览器,
 * 因此本文件守卫可静态验证的部分:反馈与结果留在与主操作相同的有界容器内,
 * 不作为新的内容流行插入 —— 这是「状态切换不推开内容」最常见的失败形态。
 *
 * 若有人把进度/结果/提示移到容器之外(例如插到内容流中形成新的行),
 * 本测试会失败。
 */

const root = new URL("../", import.meta.url);

const readSource = (path) => readFile(new URL(path, root), "utf8");

test("图片处理页:反馈与结果位于主操作同一有界容器内", async () => {
  const source = await readSource("src/tools/image-processor/ImageProcessor.tsx");

  const panelStart = source.indexOf('className="image-settings-panel"');
  assert.ok(panelStart > 0, "未找到设置面板容器");

  // 容器结束位置:下一个同级的关闭标签(以 Card 收尾)
  const panelEnd = source.indexOf("</Card>", panelStart);
  assert.ok(panelEnd > panelStart, "未找到设置面板容器结束位置");
  const panel = source.slice(panelStart, panelEnd);

  for (const region of [
    "image-processing-note",
    "image-results-summary",
    "处理全部",
  ]) {
    assert.ok(
      panel.includes(region),
      `${region} 必须位于设置面板容器内(与主操作同槽位),否则状态切换会推开内容`,
    );
  }
});

test("图片处理页:主操作与反馈之间不插入内容流区块", async () => {
  const source = await readSource("src/tools/image-processor/ImageProcessor.tsx");
  const panelStart = source.indexOf('className="image-settings-panel"');
  const panel = source.slice(panelStart, source.indexOf("</Card>", panelStart));

  // 主操作之后的直接子区块只允许结果摘要与当前图片下载(二者均为已预留槽位)
  const afterPrimary = panel.slice(panel.indexOf("处理全部"));
  const newBlocks = [...afterPrimary.matchAll(/className="([a-z-]+)"/g)]
    .map((m) => m[1])
    .filter((name) => !name.startsWith("image-results") && name !== "download-current" && name !== "spin");

  assert.deepEqual(
    newBlocks,
    [],
    `主操作之后不应新增内容流区块,发现: ${newBlocks.join(", ")}`,
  );
});

test("各工具页的进行中状态复用主操作槽位(不新增进度行)", async () => {
  const files = {
    "ImageProcessor.tsx": "src/tools/image-processor/ImageProcessor.tsx",
    "video-compressor.tsx": "src/components/video-compressor.tsx",
    "App.tsx": "src/App.tsx",
  };
  for (const [name, path] of Object.entries(files)) {
    const source = await readSource(path);
    // 进行中文案与主操作按钮在同一 Button 内(单槽替换),而非独立的进度条行
    assert.doesNotMatch(
      source,
      /<progress\b/,
      `${name} 不应使用独立的 <progress> 行呈现进度(应替换主操作槽位)`,
    );
  }
});
