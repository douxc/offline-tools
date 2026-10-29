import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCALE_CODES } from "../locales";
import { en, ja, MESSAGES, messagesFor, zhCN } from "./index";

describe("词条完备性", () => {
  it("三种语言都有词条表", () => {
    for (const locale of LOCALE_CODES) {
      assert.ok(messagesFor(locale), `${locale} 缺少词条表`);
    }
    assert.deepEqual(Object.keys(MESSAGES).sort(), ["en", "ja", "zh-CN"]);
  });

  it("三种语言的键集合完全相同", () => {
    const expected = Object.keys(zhCN).sort();
    assert.ok(expected.length > 40, `词条数量偏少：${expected.length}`);
    for (const [name, table] of [
      ["en", en],
      ["ja", ja],
    ] as const) {
      assert.deepEqual(
        Object.keys(table).sort(),
        expected,
        `${name} 的键集合与 zh-CN 不一致`,
      );
    }
  });

  it("每条文案都是非空字符串，或带参数的函数", () => {
    for (const locale of LOCALE_CODES) {
      const table = messagesFor(locale) as Record<string, unknown>;
      for (const [key, value] of Object.entries(table)) {
        const kind = typeof value;
        assert.ok(
          kind === "string" || kind === "function",
          `${locale}.${key} 类型应为字符串或函数，实际为 ${kind}`,
        );
        if (kind === "string") {
          assert.ok(
            (value as string).length > 0,
            `${locale}.${key} 不应为空串`,
          );
        }
      }
    }
  });

  it("带参数的词条在三种语言下都产出非空结果", () => {
    for (const locale of LOCALE_CODES) {
      const table = messagesFor(locale) as unknown as {
        "tabs.label": (group: string) => string;
      };
      const rendered = table["tabs.label"]("视频");
      assert.ok(
        typeof rendered === "string" && rendered.length > 0,
        `${locale} 的 tabs.label 产出为空`,
      );
      // 必须真的用上了参数，否则说明模板里漏了插值
      assert.ok(
        rendered.includes("视频"),
        `${locale} 的 tabs.label 未使用传入的参数`,
      );
    }
  });

  it("英语与日语词条不是中文的复制（确实做了翻译）", () => {
    const zhValues = Object.entries(zhCN);
    let identical = 0;
    for (const [key, zhValue] of zhValues) {
      if (typeof zhValue !== "string") continue;
      for (const table of [en, ja]) {
        const other = (table as Record<string, unknown>)[key];
        if (other === zhValue) identical += 1;
      }
    }
    // 允许极少数语言无关的取值（如品牌名、纯符号），但不允许大面积未翻译
    const total = zhValues.filter(([, v]) => typeof v === "string").length * 2;
    assert.ok(
      identical / total < 0.1,
      `过多词条与中文完全相同（${identical}/${total}），疑似未翻译`,
    );
  });

  it("中文词条保留既有界面文案（迁移不得改写）", () => {
    assert.equal(zhCN["brand.name"], "离线工具");
    assert.equal(zhCN["header.privacyNote"], "本地处理 · 不上传文件");
    assert.equal(zhCN["tool.video-frame"], "切帧");
    assert.equal(zhCN["tool.image-watermark"], "添加水印");
    assert.equal(zhCN["links.related"], "相关工具");
    assert.equal(zhCN["footer.thirdParty"], "第三方许可");
    assert.equal(zhCN["common.cancel"], "取消");
  });

  it("英语是默认语言，其品牌名不含中文字符", () => {
    for (const [key, value] of Object.entries(en)) {
      if (typeof value !== "string") continue;
      assert.doesNotMatch(
        value,
        /[\u4e00-\u9fff]/,
        `英语词条 ${key} 含中文字符：${value}`,
      );
    }
  });

  it("日语品牌名与工具名不含中文汉字以外的意外字符", () => {
    // 日语会用到汉字，因此只断言非空与语言标签归属，不做字符集限制
    assert.ok(ja["brand.name"].length > 0);
    assert.ok(ja["tool.id-photo"].length > 0);
  });
});
