import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 主题对比度契约(Apple Accessibility / WCAG AA)。
 *
 * Apple 要求:文字与背景对比度 —— 17pt 以下任意字重、18pt 常规字重均为 4.5:1
 * (粗体为 3:1),且支持 Dark Mode 时必须在亮暗两种外观下都满足。
 *
 * 本项目界面文字均小于 18pt,故统一按 4.5:1 校验。实心按钮上的文字属于正文级
 * 文字,同样按 4.5:1 要求 —— 这是本次改造中发现并修正的真实缺陷:原
 * --primary / --destructive 在白字下仅 3.4-3.7:1。
 */

const root = new URL("../", import.meta.url);

/* ---------- OKLCH -> 相对亮度 -> WCAG 对比度 ---------- */

const oklchToLinearSrgb = (L, C, H) => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const relativeLuminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => Math.min(1, Math.max(0, c)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (la, lb) => {
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

/* ---------- 从 index.css 读取主题 token ---------- */

const readThemeTokens = async () => {
  const css = await readFile(new URL("src/index.css", root), "utf8");
  const blockOf = (selector) => {
    const start = css.indexOf(selector);
    assert.ok(start >= 0, `缺少样式块 ${selector}`);
    const open = css.indexOf("{", start);
    const close = css.indexOf("}", open);
    const body = css.slice(open, close);
    const tokens = {};
    for (const [, name, value] of body.matchAll(
      /(--[a-z0-9-]+)\s*:\s*oklch\(([^)]+)\)/g,
    )) {
      const parts = value.trim().split(/\s+/);
      if (parts.length < 3) continue;
      const L = parts[0].endsWith("%")
        ? Number.parseFloat(parts[0]) / 100
        : Number.parseFloat(parts[0]);
      tokens[name] = [L, Number.parseFloat(parts[1]), Number.parseFloat(parts[2])];
    }
    return tokens;
  };
  return {
    dark: blockOf(":root,\n.dark {"),
    light: blockOf(".light {"),
  };
};

/** 文字 token 与其背景 token 的组合。 */
const PAIRS = [
  ["次要文字/底色", "--muted-foreground", "--background"],
  ["次要文字/卡片", "--muted-foreground", "--card"],
  ["正文/底色", "--foreground", "--background"],
  ["正文/卡片", "--foreground", "--card"],
  ["主按钮文字", "--primary-foreground", "--primary"],
  ["危险按钮文字", "--destructive-foreground", "--destructive"],
  ["成功提示文字", "--success-foreground", "--success"],
  ["警示文字", "--warning-foreground", "--warning"],
];

const AA_NORMAL_TEXT = 4.5;

test("亮暗两态下文字与背景对比度均满足 WCAG AA 4.5:1", async () => {
  const themes = await readThemeTokens();
  const failures = [];
  for (const [mode, tokens] of Object.entries(themes)) {
    for (const [label, fg, bg] of PAIRS) {
      assert.ok(tokens[fg], `${mode} 主题缺少 ${fg}`);
      assert.ok(tokens[bg], `${mode} 主题缺少 ${bg}`);
      const ratio = contrastRatio(
        relativeLuminance(oklchToLinearSrgb(...tokens[fg])),
        relativeLuminance(oklchToLinearSrgb(...tokens[bg])),
      );
      if (ratio < AA_NORMAL_TEXT) {
        failures.push(`${mode} ${label} ${ratio.toFixed(2)}:1`);
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    `以下组合低于 ${AA_NORMAL_TEXT}:1:\n${failures.join("\n")}`,
  );
});
