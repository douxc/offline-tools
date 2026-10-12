import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { LanguageSwitcher } from "./language-switcher";
import { LOCALE_CODES, LOCALES } from "@/lib/i18n/locales";
import { withLocale } from "@/lib/i18n/test-locale";
import {
  languageSwitchPath,
  SWITCHABLE_LOCALES,
  SWITCHABLE_ROUTES,
} from "@/lib/i18n/switch-locale";
import { toolHref } from "@/lib/i18n/routes";

/**
 * 切换路径的纯逻辑：穷举「当前路径 × 目标语言」。
 *
 * 组件里的 `window.location.assign` 无法在 SSR 测试中驱动，因此把这段逻辑抽成
 * 纯函数单独验证；spec 要求「切换语言保持当前工具」，这必须被穷举而不是抽查。
 */
describe("languageSwitchPath（切换保持当前工具）", () => {
  it("7 个工具 × 3 种目标语言 = 21 条路径全部正确", () => {
    for (const route of SWITCHABLE_ROUTES) {
      for (const next of SWITCHABLE_LOCALES) {
        // 从每种语言的当前路径出发
        for (const from of SWITCHABLE_LOCALES) {
          const current = toolHref(from, route);
          assert.equal(
            languageSwitchPath(current, next),
            toolHref(next, route),
            `${current} -> ${next} 应得到 ${toolHref(next, route)}`,
          );
        }
      }
    }
  });

  it("日语页切到英语回到根路径（去掉前缀，不加 /en）", () => {
    assert.equal(languageSwitchPath("/ja/video-compress/", "en"), "/video-compress/");
    assert.equal(languageSwitchPath("/ja/", "en"), "/");
  });

  it("英语页切到日语/中文加上对应前缀", () => {
    assert.equal(languageSwitchPath("/video-compress/", "ja"), "/ja/video-compress/");
    assert.equal(languageSwitchPath("/video-compress/", "zh-CN"), "/zh/video-compress/");
  });

  it("中文页切到日语直接换前缀", () => {
    assert.equal(languageSwitchPath("/zh/id-photo/", "ja"), "/ja/id-photo/");
  });

  it("首页在三种语言间切换", () => {
    assert.equal(languageSwitchPath("/", "ja"), "/ja/");
    assert.equal(languageSwitchPath("/ja/", "zh-CN"), "/zh/");
    assert.equal(languageSwitchPath("/zh/", "en"), "/");
  });

  it("切换结果永不含 /en 前缀", () => {
    for (const route of SWITCHABLE_ROUTES) {
      for (const from of SWITCHABLE_LOCALES) {
        const target = languageSwitchPath(toolHref(from, route), "en");
        assert.ok(!target.startsWith("/en/"), target);
      }
    }
  });

  it("未知语言前缀不被吞掉（按无前缀处理）", () => {
    // /fr/video-frame/ 不是支持的语言前缀，应保持工具判定为 video-frame
    assert.equal(languageSwitchPath("/fr/video-frame/", "ja"), "/ja/video-frame/");
  });

  it("暴露的枚举与语言/工具数据源一致", () => {
    assert.equal(SWITCHABLE_LOCALES.length, LOCALE_CODES.length);
    assert.equal(SWITCHABLE_ROUTES.length, 7);
  });
});

describe("LanguageSwitcher", () => {
  const render = (locale: (typeof LOCALE_CODES)[number]) =>
    renderToString(withLocale(createElement(LanguageSwitcher), locale));

  it("渲染出可被辅助技术识别的入口（combobox 语义 + 随语言变化的无障碍名）", () => {
    for (const locale of LOCALE_CODES) {
      const html = render(locale);
      assert.match(html, /role="combobox"/, `${locale} 应有 combobox 语义`);
      assert.match(
        html,
        /aria-label="(切换语言|Change language|言語を切り替え)"/,
        `${locale} 的入口应有随语言变化的无障碍名`,
      );
      assert.match(html, /language-switcher/, `${locale} 应有可见样式类`);
    }
  });

  it("标明当前语言（触发器显示当前语言的名称）", () => {
    // Radix Select 在 SSR 下只渲染触发器（选项在 Portal 里，仅客户端挂载），
    // 因此这里只能验证触发器确实显示了当前语言。
    assert.match(render("en"), /English/);
    assert.match(render("zh-CN"), /简体中文/);
    assert.match(render("ja"), /日本語/);
  });

  it("触发器的无障碍名在三种语言下互不相同", () => {
    const names = LOCALE_CODES.map((locale) => {
      const html = render(locale);
      return html.match(/aria-label="([^"]+)"/)?.[1] ?? "";
    });
    assert.equal(new Set(names).size, LOCALE_CODES.length, "无障碍名应随语言变化");
  });

  it("选项集合由语言数据源决定，覆盖全部支持语言且默认语言在前", () => {
    // 展开后的选项列表在 Portal 中渲染，SSR 断言不到（见 6.4 的人工浏览器检查）。
    // 这里守住**数据契约**：选项来自 LOCALE_CODES、数量与顺序正确、名称非空。
    assert.equal(LOCALE_CODES.length, 3);
    assert.deepEqual([...LOCALE_CODES], ["en", "zh-CN", "ja"]);
    for (const code of LOCALE_CODES) {
      assert.ok(
        LOCALES[code].displayName.length > 0,
        `${code} 缺少显示名`,
      );
    }
    // 语言名用该语言自身书写：三种界面的选项文字相同
    assert.equal(LOCALES["zh-CN"].displayName, "简体中文");
    assert.equal(LOCALES.ja.displayName, "日本語");
    assert.equal(LOCALES.en.displayName, "English");
  });
});
