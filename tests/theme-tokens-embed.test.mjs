import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

/**
 * 设计 token 契约。
 *
 * 断言 shadcn 语义 token 结构完整、亮暗主题键集合一致、主题以类名为键、
 * 颜色不为硬编码,以及 ui 组件改用语义工具类。这些断言防护的是本项目
 * 真实发生过的缺陷:一次 CSS 重构弄丢了亮色 token 块(ed4917f),另一次
 * 机械替换把变量值替换成了自身。
 */

const root = new URL("../", import.meta.url);

/** 默认主题块的选择器(与只放结构性标量的 :root 块区分开)。 */
const DEFAULT_THEME_SELECTOR = ":root,\n.dark";

const readCss = () => readFile(new URL("src/index.css", root), "utf8");

/**
 * 取出某个顶层选择器块的声明体。
 * 选择器列表可能跨行(`:root,\n.dark {`),故用 [^{}]* 吃掉选择器列表。
 */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(
    new RegExp(`(?:^|\\})\\s*${escaped}[^{}]*\\{([^}]*)\\}`, "m"),
  );
  return m?.[1] ?? null;
};

const SHADCN_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--warning",
  "--warning-foreground",
];

test("shadcn 语义 token 在默认与亮色主题中均定义完整", async () => {
  const css = await readCss();
  const defaultBlock = blockOf(css, DEFAULT_THEME_SELECTOR) ?? "";
  const lightBlock = blockOf(css, ".light");
  assert.ok(defaultBlock, "缺少 :root/.dark 默认 token 块");
  assert.ok(lightBlock, "缺少 .light 亮色 token 块");

  for (const token of SHADCN_TOKENS) {
    assert.match(
      defaultBlock,
      new RegExp(`${token}\\s*:`),
      `默认主题缺少 ${token}`,
    );
    assert.match(
      lightBlock,
      new RegExp(`${token}\\s*:`),
      `亮色主题缺少 ${token}`,
    );
  }
  // --radius 是不随主题变化的结构性标量,定义在共享 :root 块中
  const sharedBlock = blockOf(css, ":root");
  assert.match(sharedBlock ?? "", /--radius\s*:/, "缺少共享的 --radius");
});

test("两个主题的 shadcn 语义 token 集合完全一致", async () => {
  const css = await readCss();
  const inBoth = (name) =>
    new RegExp(`--${name}\\s*:`).test(blockOf(css, DEFAULT_THEME_SELECTOR) ?? "") &&
    new RegExp(`--${name}\\s*:`).test(blockOf(css, ".light") ?? "");
  // 精确核对:语义 token 必须在两个主题都有定义。这条断言防护的是本项目
  // 真实发生过的缺陷 —— ed4917f 中一次 CSS 重构弄丢了整个亮色 token 块。
  const missing = SHADCN_TOKENS.map((t) => t.replace(/^--/, "")).filter(
    (name) => name !== "radius" && !inBoth(name),
  );
  assert.deepEqual(missing, [], `以下语义 token 未在两个主题同时定义: ${missing.join(", ")}`);
});

test("颜色以 oklch 表达,旧 token 命名不回流", async () => {
  const css = await readCss();
  assert.ok(
    (css.match(/oklch\(/g) ?? []).length >= 40,
    "颜色应统一使用 oklch",
  );
  for (const legacy of [
    "--acid",
    "--ink",
    "--line",
    "--panel",
    "--soft-text",
    "--control-bg",
    "--control-border",
    "--slider-track",
  ]) {
    assert.doesNotMatch(
      css,
      new RegExp(`var\\(${legacy}\\)`),
      `旧 token ${legacy} 不应再被引用`,
    );
  }
});

test("主题以 .dark/.light 类为键,不使用 data-theme", async () => {
  for (const file of [
    "src/index.css",
    "src/lib/theme.tsx",
    "src/main.tsx",
    "src/components/tool-header.tsx",
  ]) {
    const text = await readFile(new URL(file, root), "utf8");
    assert.doesNotMatch(
      text,
      /data-theme/,
      `${file} 不应再使用 data-theme 机制`,
    );
  }
  const theme = await readFile(new URL("src/lib/theme.tsx", root), "utf8");
  assert.match(theme, /next-themes/, "主题应由 next-themes 管理");
  assert.match(theme, /attribute="class"/, "next-themes 应以类名为键");
});

test("ui 组件不直写 CSS 变量(应使用语义工具类)", async () => {
  const dir = new URL("src/components/ui/", root);
  const entries = await readdir(dir);
  const offenders = [];
  for (const entry of entries.filter((e) => e.endsWith(".tsx"))) {
    const text = await readFile(new URL(entry, dir), "utf8");
    const hits = [...text.matchAll(/var\(--[a-z0-9-]+\)/g)].map((m) => m[0]);
    if (hits.length > 0) {
      offenders.push(`${entry}: ${[...new Set(hits)].join(", ")}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `ui 组件应改用语义工具类:\n${offenders.join("\n")}`,
  );
});

test("checker 变量不得自引用(防止机械替换把值替换成自身)", async () => {
  const css = await readCss();
  assert.match(css, /--checker-a:\s*oklch\(/);
  assert.match(css, /--checker-b:\s*oklch\(/);
  assert.doesNotMatch(css, /--checker-a:\s*var\(--checker-a\)/);
  assert.doesNotMatch(css, /--checker-b:\s*var\(--checker-b\)/);
});

/**
 * 硬编码色值约束。
 *
 * visual-system 要求颜色通过语义 token 表达。少数**固定表面**必须有恒定色值,
 * 与主题无关,因此按选择器精确豁免,而不是放宽整条规则:
 *   - 视频舞台 / 分享卡:媒体底衬恒定深色
 *   - 打印纸面与 @media print 区块:必须是白纸
 *   - mask-image 的 #000:只表达"完全不透明",不是配色
 */
const FIXED_SURFACE_SELECTORS = [
  ".video-stage",
  ".share-card",
  ".a4-sheet",
  "@media print",
];

/** @media print 内的规则在选择器上不带该前缀,按属性单独豁免。 */
const PRINT_OVERRIDE = /background:\s*#fff\s*!important/;

test("非固定表面的规则不硬编码色值", async () => {
  const css = await readCss();

  // 逐条规则检查:选择器 + 声明体
  const offenders = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = selector.trim();
    if (sel.startsWith("--") || sel.startsWith("@theme")) continue;
    // 变量声明块由其他断言负责
    if (/^\s*--/.test(body.trim())) continue;

    const exempt =
      FIXED_SURFACE_SELECTORS.some((s) => sel.includes(s)) ||
      PRINT_OVERRIDE.test(body) ||
      /mask-image/.test(body);

    for (const [, prop, value] of body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
      if (prop.startsWith("--")) continue;
      if (!/#[0-9a-fA-F]{3,8}\b/.test(value)) continue;
      if (exempt) continue;
      offenders.push(`${sel} { ${prop}: ${value.trim()} }`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `以下规则应改用语义 token(或按选择器加入固定表面豁免):\n${offenders.join("\n")}`,
  );
});
