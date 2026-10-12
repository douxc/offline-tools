/**
 * 残留中文扫描的**共享实现**（测试与统计都走这里）。
 *
 * ## 为什么用 TypeScript 解析器而不是正则/手写词法
 *
 * 这个指标用来回答「还剩多少条没迁」，因此必须可信。前后两版手写实现都不可信：
 *
 * 1. 第一版把引号串与 JSX 文本塞进同一条正则，且字符类排除了换行 ——
 *    **跨行字符串只统计到第一段**。`IdPhoto.tsx` 实际 48 条被计成 10，
 *    指标系统性低估了剩余工作量。
 * 2. 第二版改为逐字符切分引号，仍无法正确处理「模板字面量里嵌 JSX、
 *    JSX 属性里再用反引号」这种真实写法（`className={`a ${b}`}`）：
 *    在 `App.tsx` 上先多算 2 条噪声，改为在 `${` 截断后又反过来漏掉 JSX 文本。
 *
 * 结论：在真实 JSX 上做词法级手写扫描不可靠。这里改用 TypeScript 自带的解析器
 * 遍历 AST，只统计**确定是文案**的节点：字符串字面量、模板字面量的静态片段、
 * JSX 文本节点、以及 JSX 属性里的字符串值。
 *
 * TypeScript 是本项目的开发依赖，不引入新依赖。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const CJK = /[\u4e00-\u9fff]/;

/** 解析一个源文件为 AST（按 TSX 解析，.ts 也能接受）。 */
export const parseSource = (fileName: string, source: string) =>
  ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

/** 收集文件里所有含中文的「文案条目」。 */
export const listChineseEntries = (
  source: string,
  fileName = "file.tsx",
): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      if (CJK.test(node.text)) found.push(node.text);
    } else if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (text && CJK.test(text)) found.push(text);
    }
    ts.forEachChild(node, visit);
  };
  visit(parseSource(fileName, source));
  return found;
};

/** 统计一个源文件里含中文的文案条目数。 */
export const countChineseEntries = (
  source: string,
  fileName = "file.tsx",
): number => listChineseEntries(source, fileName).length;

/** 递归收集参与扫描的源文件（相对 src/ 的路径）。 */
export const collectScannableFiles = (
  srcDir: string,
  options: { excludeDirs?: string[]; excludeFiles?: string[] } = {},
): string[] => {
  const excludeDirs = options.excludeDirs ?? ["i18n"];
  const excludeFiles = options.excludeFiles ?? [];
  const walk = (dir: string, base = ""): string[] => {
    const found: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const relative = base ? `${base}/${entry}` : entry;
      if (statSync(full).isDirectory()) {
        if (excludeDirs.includes(entry)) continue;
        found.push(...walk(full, relative));
      } else if (
        (entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
        !entry.includes(".test.") &&
        !excludeFiles.includes(relative)
      ) {
        found.push(relative);
      }
    }
    return found;
  };
  return walk(srcDir);
};

/** 统计整个 src/ 目录，返回「文件 -> 条目数」以及总数。 */
export const scanSourceTree = (
  srcDir: string,
  options?: { excludeDirs?: string[]; excludeFiles?: string[] },
): { perFile: Record<string, number>; total: number } => {
  const perFile: Record<string, number> = {};
  let total = 0;
  for (const relative of collectScannableFiles(srcDir, options)) {
    const count = countChineseEntries(
      readFileSync(path.join(srcDir, relative), "utf8"),
      relative,
    );
    if (count > 0) {
      perFile[relative] = count;
      total += count;
    }
  }
  return { perFile, total };
};
