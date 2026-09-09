import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("亮色主题 token 定义完整（[data-theme=light] 存在且含全部基础变量）", async () => {
  const css = await readFile(new URL("src/index.css", root), "utf8");
  const m = css.match(/\[data-theme="light"\]\s*\{([^}]*)\}/);
  assert.ok(m, "缺少 [data-theme='light'] token 块");
  const decl = m[1];
  assert.match(decl, /--page:\s*#f5f5f7/);
  assert.match(decl, /--ink:\s*#1d1d1f/);
  assert.match(decl, /--panel:\s*#fff/);
  assert.match(decl, /--panel-raised:\s*#f2f2f7/);
  assert.match(decl, /--muted:\s*#6e6e73/);
  assert.match(decl, /--acid:\s*#0071e3/);
  assert.match(decl, /--success:\s*#34c759/);
});

test("checker 变量不得自引用（防止机械替换把值替换成自身）", async () => {
  const css = await readFile(new URL("src/index.css", root), "utf8");
  assert.match(css, /--checker-a:\s*#111110/);
  assert.match(css, /--checker-b:\s*#191918/);
  assert.doesNotMatch(css, /--checker-a:\s*var\(--checker-a\)/);
});
