import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 首帧主题脚本契约。
 *
 * 21 个语言入口在 `</head>` 前内联一段脚本,在样式表与模块脚本加载之前把已保存的
 * 主题类挂到根元素,避免 next-themes 挂载前出现亮暗闪烁。该脚本独立于 React,
 * 因此存储键与取值会与 `src/lib/theme.tsx` 形成隐式耦合 —— 任何一侧漂移都会
 * 静默退回"闪烁",本文件把这份契约钉住。
 */

const root = new URL("../", import.meta.url);
const distRoot = new URL("../dist/", import.meta.url);

import { allEntryCombinations } from "../src/lib/i18n/entry-html.ts";

/** dist 中的入口 HTML 路径：URL 路径 -> `<路径>/index.html`。 */
const distEntry = (urlPath) =>
  `${[...urlPath.split("/").filter(Boolean), "index.html"].join("/")}`;

/** 全部 21 个「语言 × 工具」入口，由语言数据源驱动。 */
const ENTRY_FILES = allEntryCombinations().map(({ path }) => distEntry(path));

const ENTRIES = ENTRY_FILES;

/** 产物读 dist；theme.tsx 仍读源码。 */
const read = (path) => readFile(new URL(path, root), "utf8");
const readEntry = (path) => readFile(new URL(path, distRoot), "utf8");

test("21 个语言入口均在 </head> 前内联首帧主题脚本", async () => {
  for (const entry of ENTRIES) {
    const html = await readEntry(entry);
    const scriptAt = html.indexOf("offline-tools-theme");
    const headEnd = html.indexOf("</head>");
    assert.ok(scriptAt > 0, `${entry} 缺少首帧主题脚本`);
    assert.ok(
      scriptAt < headEnd,
      `${entry} 的主题脚本必须在 </head> 之前,否则无法在首帧前生效`,
    );
    // 必须早于模块入口脚本
    const moduleAt = html.indexOf('type="module"');
    assert.ok(
      moduleAt === -1 || scriptAt < moduleAt,
      `${entry} 的主题脚本必须早于模块脚本`,
    );
    assert.match(html, /classList\.add\("dark"\)/, `${entry} 应能落到暗色`);
    assert.match(html, /classList\.add\("light"\)/, `${entry} 应能落到亮色`);
  }
});

test("内联脚本的存储键与取值和 theme.tsx 一致", async () => {
  const theme = await read("src/lib/theme.tsx");

  // 存储键:theme.tsx 的 THEME_STORAGE_KEY 必须与内联脚本字面量相同
  const key = theme.match(/THEME_STORAGE_KEY\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(key, "theme.tsx 应定义 THEME_STORAGE_KEY");
  for (const entry of ENTRIES) {
    const html = await readEntry(entry);
    assert.ok(
      html.includes(`localStorage.getItem("${key}")`),
      `${entry} 的存储键应为 "${key}",与 theme.tsx 保持一致`,
    );
  }

  // 取值:next-themes 的 value 映射必须与内联脚本使用的类名一致
  assert.match(
    theme,
    /value=\{\{\s*light:\s*"light",\s*dark:\s*"dark"\s*\}\}/,
    "theme.tsx 的 value 映射应为 light/dark",
  );
  // 默认主题为 dark:内联脚本在无存储值时应落到 dark
  assert.match(theme, /defaultTheme="dark"/, "默认主题应为 dark");
});
