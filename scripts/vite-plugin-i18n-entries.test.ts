import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  GENERATED_MARKER,
  i18nEntriesPlugin,
  isOwnedDir,
  listEntrySources,
  pruneEmptyDirs,
  removeAndPrune,
  renderGeneratedEntry,
} from "./vite-plugin-i18n-entries";

describe("listEntrySources", () => {
  it("共 21 个「语言 × 工具」入口", () => {
    assert.equal(listEntrySources().length, 21);
  });

  it("英语入口在根路径，中文/日语在各自前缀下", () => {
    const sources = listEntrySources();
    const byPath = Object.fromEntries(
      sources.map((source) => [`${source.locale}:${source.route}`, source.urlPath]),
    );
    assert.equal(byPath["en:home"], "/");
    assert.equal(byPath["en:video-frame"], "/video-frame/");
    assert.equal(byPath["zh-CN:home"], "/zh/");
    assert.equal(byPath["zh-CN:video-frame"], "/zh/video-frame/");
    assert.equal(byPath["ja:home"], "/ja/");
    assert.equal(byPath["ja:video-frame"], "/ja/video-frame/");
  });

  it("不存在 /en 前缀的入口", () => {
    for (const source of listEntrySources()) {
      assert.ok(
        !source.urlPath.startsWith("/en/"),
        `${source.urlPath} 不应存在 /en 前缀`,
      );
    }
  });

  it("文件路径与 URL 路径一一对应", () => {
    const expected: Record<string, string> = {
      "/": "index.html",
      "/zh/": "zh/index.html",
      "/ja/": "ja/index.html",
      "/video-frame/": "video-frame/index.html",
      "/zh/video-frame/": "zh/video-frame/index.html",
      "/ja/image-a4-layout/": "ja/image-a4-layout/index.html",
    };
    const byUrl = Object.fromEntries(
      listEntrySources().map((source) => [source.urlPath, source.relativeFile]),
    );
    for (const [url, file] of Object.entries(expected)) {
      assert.equal(byUrl[url], file, `${url} 的文件路径`);
    }
  });

  it("每个入口的 URL 与文件路径都是唯一且规范的", () => {
    const sources = listEntrySources();
    assert.equal(new Set(sources.map((s) => s.urlPath)).size, sources.length);
    assert.equal(
      new Set(sources.map((s) => s.relativeFile)).size,
      sources.length,
    );
    for (const source of sources) {
      assert.ok(source.urlPath.startsWith("/"), source.urlPath);
      assert.ok(source.urlPath.endsWith("/"), source.urlPath);
      // 首页是根下的 index.html，其余都落在各自目录里
      assert.ok(
        source.relativeFile === "index.html" ||
          source.relativeFile.endsWith("/index.html"),
        source.relativeFile,
      );
      assert.doesNotMatch(source.relativeFile, /^\//, source.relativeFile);
    }
  });
});

describe("renderGeneratedEntry", () => {
  it("带生成标记，清理逻辑据此识别", () => {
    for (const source of listEntrySources()) {
      assert.ok(
        renderGeneratedEntry(source).startsWith(GENERATED_MARKER),
        `${source.relativeFile} 缺少生成标记`,
      );
    }
  });

  it("写入源码入口脚本，构建时由 Vite 改写为打包产物", () => {
    const html = renderGeneratedEntry(listEntrySources()[0]);
    assert.match(html, /<script type="module" src="\/src\/main\.tsx"><\/script>/);
  });

  it("保留站点 URL 与统计标识占位符，交由 siteMetaPlugin 注入", () => {
    for (const source of listEntrySources()) {
      const html = renderGeneratedEntry(source);
      assert.ok(html.includes("__SITE_URL__"), `${source.relativeFile}`);
      assert.ok(html.includes("__ANALYTICS_ID__"), `${source.relativeFile}`);
    }
  });

  it("不改动 body 结构：模块脚本仍在 body 内", () => {
    const html = renderGeneratedEntry(listEntrySources()[0]);
    const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
    assert.match(body, /id="root"/);
    assert.match(body, /<script type="module"/);
    assert.equal(html.match(/<\/body>/g)?.length, 1);
  });
});

describe("插件形状", () => {
  it("名称与 enforce 满足既有插件顺序要求", () => {
    const plugin = i18nEntriesPlugin({ dryRun: true });
    assert.equal(plugin.name, "offline-tools:i18n-entries");
    // 必须早于 siteMetaPlugin，生成的文件才会经过占位符注入
    assert.equal(plugin.enforce, "pre");
  });

  it("dryRun 声明了 buildStart 与 closeBundle 钩子", () => {
    const plugin = i18nEntriesPlugin({ dryRun: true });
    assert.equal(typeof plugin.buildStart, "function");
    assert.equal(typeof plugin.closeBundle, "function");
  });
});

/**
 * 真实文件系统上的清理行为。
 *
 * 这一组存在的理由：`pruneEmptyDirs` 曾长期残留空目录，根因是
 * `rmSync(dir, { recursive: false })` 无法删除目录（抛 EISDIR），而错误被一个
 * 裸 `catch { break }` 吞掉。此前所有断言都只读源码文本、没有触碰真实文件系统，
 * 因此这个 bug 一直隐形。这里用真实临时目录驱动。
 */
describe("目录回收（真实文件系统）", () => {
  const withTempDir = async (run) => {
    const root = await mkdtemp(path.join(tmpdir(), "i18n-entries-"));
    try {
      await run(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  };

  it("生成文件删除后，空目录被回收", async () => {
    await withTempDir(async (root) => {
      const dir = path.join(root, "video-frame");
      const file = path.join(dir, "index.html");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, `${GENERATED_MARKER}\n<html></html>`);

      rmSync(file, { force: true });
      pruneEmptyDirs(root, file);

      assert.equal(existsSync(dir), false, "空目录应被回收");
    });
  });

  it("多层生成目录同样回收", async () => {
    await withTempDir(async (root) => {
      const dir = path.join(root, "ja", "video-frame");
      const file = path.join(dir, "index.html");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, `${GENERATED_MARKER}\n<html></html>`);

      rmSync(file, { force: true });
      pruneEmptyDirs(root, file);

      assert.equal(existsSync(path.join(root, "ja")), false, "应一路回收到 root");
    });
  });

  it("含非生成内容的目录不被回收", async () => {
    await withTempDir(async (root) => {
      const dir = path.join(root, "src");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "app.ts"), "export {};");

      pruneEmptyDirs(root, path.join(dir, "index.html"));

      assert.equal(existsSync(dir), true, "有非生成内容时不得删目录");
    });
  });

  it("含非生成 HTML 的目录不被回收", async () => {
    await withTempDir(async (root) => {
      const dir = path.join(root, "docs");
      const file = path.join(dir, "index.html");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, "<html>用户手写页面</html>");

      pruneEmptyDirs(root, file);

      assert.equal(existsSync(dir), true, "非生成 HTML 应被视为用户内容");
    });
  });

  it("不越过 root 向上回收", async () => {
    await withTempDir(async (root) => {
      const dir = path.join(root, "zh");
      const file = path.join(dir, "index.html");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, `${GENERATED_MARKER}\n<html></html>`);

      rmSync(file, { force: true });
      pruneEmptyDirs(root, file);

      assert.equal(existsSync(root), true, "root 本身必须保留");
    });
  });

  it("isOwnedDir 只认「空目录」或「全为生成 HTML」", async () => {
    await withTempDir(async (root) => {
      const owned = path.join(root, "owned");
      mkdirSync(owned);
      assert.equal(isOwnedDir(owned), true, "空目录属于插件");

      writeFileSync(
        path.join(owned, "index.html"),
        `${GENERATED_MARKER}\n<html></html>`,
      );
      assert.equal(isOwnedDir(owned), true, "只含生成 HTML 属于插件");

      writeFileSync(path.join(owned, "notes.md"), "x");
      assert.equal(isOwnedDir(owned), false, "含其他文件即不属于插件");
    });
  });

  it("removeAndPrune 在真实目录上生效", async () => {
    await withTempDir(async (root) => {
      const dir = path.join(root, "zh", "video-frame");
      const file = path.join(dir, "index.html");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, `${GENERATED_MARKER}\n<html></html>`);

      removeAndPrune(root, file);

      assert.equal(existsSync(file), false, "文件应删除");
      assert.equal(existsSync(dir), false, "空目录应回收");
      assert.equal(existsSync(path.join(root, "zh")), false, "父目录也应回收");
    });
  });
});

/**
 * 数据丢失防护。
 *
 * 开发本插件时真出过事故：生成器写出的路径与既有入口页重叠，清理时直接删除，
 * 于是源码里**未纳入 git** 的 `id-photo/index.html` 被一次构建删掉且无法恢复。
 * 因此把「已有内容必须恢复而非删除」固化成测试。
 */
describe("生成器不得破坏既有源文件", () => {
  it("清理逻辑区分「新建」与「覆盖」：只删新建的，覆盖的按原文恢复", async () => {
    const source = await readFile(
      new URL("./vite-plugin-i18n-entries.ts", import.meta.url),
      "utf8",
    );
    // 必须同时维护 created 与 overwritten 两个集合
    assert.match(source, /const created = new Set<string>\(\)/);
    assert.match(source, /const overwritten = new Map<string, string>\(\)/);
    // closeBundle 必须恢复被覆盖的文件
    assert.match(source, /for \(const \[file, original\] of overwritten\)/);
    // 且不得把「已存在但无标记」的文件当作自建文件删除
    assert.match(source, /if \(!original\.startsWith\(GENERATED_MARKER\)\)/);
  });

  it("cleanup 先删自建文件、再恢复被覆盖文件", async () => {
    const source = await readFile(
      new URL("./vite-plugin-i18n-entries.ts", import.meta.url),
      "utf8",
    );
    const cleanupBody = source.slice(
      source.indexOf("const cleanup = ()"),
      source.indexOf("return {"),
    );
    const deleteAt = cleanupBody.indexOf("for (const file of created)");
    const restoreAt = cleanupBody.indexOf("of overwritten");
    assert.ok(deleteAt >= 0 && restoreAt >= 0, "cleanup 应同时处理两类文件");
    assert.ok(deleteAt < restoreAt, "应先删自建文件再恢复既有文件");
  });
});
