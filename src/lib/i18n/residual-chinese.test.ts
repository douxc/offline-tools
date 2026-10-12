import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  collectScannableFiles,
  countChineseEntries,
  listChineseEntries,
} from "./scan-chinese";

/**
 * 残留中文扫描 —— 任务 4.2 的完成门槛。
 *
 * 「界面文案全部三语化」无法靠人工目视保证：遗漏处只会表现为某种语言下混排
 * 中文，而其余测试都是断言「应该出现什么」，不会发现「不该出现的仍在」。
 *
 * ## 从棘轮到绝对断言
 *
 * 迁移期间这里维护过一份 `PENDING`（未完成文件 -> 条目数），数字只允许下降，
 * 用来在「边迁边漏」时挡住新增。全部清零后改为**绝对断言**：
 * `src/` 下（排除词条目录与法定标识）不允许出现任何硬编码中文文案。
 *
 * 计数口径见 `scan-chinese.ts`：用 TypeScript 解析器走 AST，只统计确定是文案
 * 的节点（字符串字面量、模板字面量静态片段、JSX 文本/属性）。此前两版手写
 * 正则都不可靠 —— 第一版把跨行字符串只统计到第一段（`IdPhoto.tsx` 48 条计成
 * 10），第二版无法处理「模板字面量里嵌 JSX」的写法。一个用来衡量「还剩多少」
 * 的指标必须可信，因此不再手写词法分析。
 */

const root = new URL("../../../", import.meta.url);
const srcDir = new URL("src/", root).pathname;

/** 中文属于**法定标识**或语言自身名称，不参与翻译。 */
const NON_TRANSLATABLE = [
  // ICP 备案号是法定标识，三种语言下都必须原样呈现
  "components/icp-footer.tsx",
];

const EXCLUDED_FILES = [
  // 纯注释文件：中文只出现在注释里，没有用户可见文案
  "lib/analytics.ts",
  "lib/tool-analytics.ts",
  "lib/route-analytics.ts",
  ...NON_TRANSLATABLE,
];

describe("残留中文扫描（4.2 完成门槛）", () => {
  const files = collectScannableFiles(srcDir, {
    excludeDirs: ["i18n"],
    excludeFiles: EXCLUDED_FILES,
  });

  it("扫描覆盖渲染路径可达的源文件", () => {
    assert.ok(files.length > 20, `扫描到的文件过少：${files.length}`);
    assert.ok(files.includes("App.tsx"), "应覆盖 App.tsx");
    assert.ok(
      files.includes("components/tool-header.tsx"),
      "应覆盖 tool-header.tsx",
    );
  });

  it("已三语化的文件不含硬编码中文", () => {
    const done = [
      "components/tool-header.tsx",
      "components/tool-tabs.tsx",
      "components/tool-links.tsx",
      "components/tool-seo-content.tsx",
      "components/license-footer.tsx",
      "components/pwa-status.tsx",
      "components/ui/popconfirm.tsx",
      "components/batch-sampling-controls.tsx",
      "components/text-overlay-panel.tsx",
      "components/video-compressor.tsx",
      "App.tsx",
      "tools/image-processor/ImageProcessor.tsx",
      "tools/id-photo/IdPhoto.tsx",
      "tools/image-a4-layout/A4ImageLayout.tsx",
      "tools/id-photo/CropPreview.tsx",
      "lib/seo.ts",
      "lib/tool-navigation.ts",
      "ToolHome.tsx",
      "main.tsx",
    ];
    for (const file of done) {
      const entries = listChineseEntries(
        readFileSync(path.join(srcDir, file), "utf8"),
        file,
      );
      assert.deepEqual(
        entries,
        [],
        `${file} 仍有硬编码中文：${entries.slice(0, 5).join(" / ")}`,
      );
    }
  });

  it("不允许任何硬编码中文文案（棘轮已清空，改为绝对断言）", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const entries = listChineseEntries(
        readFileSync(path.join(srcDir, file), "utf8"),
        file,
      );
      if (entries.length > 0) {
        offenders.push(`${file}: ${entries.length} 条 — ${entries[0].slice(0, 30)}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `以下文件仍有硬编码中文，必须迁入词条：\n${offenders.join("\n")}`,
    );
  });

  it("允许的中文只出现在注释、词条目录与法定标识里", () => {
    // 反向守卫：确认排除清单没有把真实问题一起排除掉。
    // ICP 备案号是法定标识，必须原样呈现，因此显式豁免。
    const icp = readFileSync(
      path.join(srcDir, "components/icp-footer.tsx"),
      "utf8",
    );
    assert.match(icp, /ICP备/, "ICP 页脚应包含备案号（法定标识，豁免翻译）");
    assert.equal(
      countChineseEntries(icp, "components/icp-footer.tsx"),
      1,
      "ICP 页脚只应有备案号这一条中文",
    );
  });
});
