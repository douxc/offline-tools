import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  DEFAULT_LOCALE,
  isLocaleCode,
  LOCALE_CODES,
  LOCALE_STORAGE_KEY,
  LOCALES,
  localeExplicitInPath,
  localeForPrefix,
  resolveLocale,
} from "./locales";

describe("locales 权威数据", () => {
  it("支持英语、简体中文、日语三种语言", () => {
    assert.deepEqual([...LOCALE_CODES].sort(), ["en", "ja", "zh-CN"]);
  });

  it("恰好一个默认语言，且英语占据根路径", () => {
    const defaults = LOCALE_CODES.filter(
      (code) => LOCALES[code].prefix === "",
    );
    assert.deepEqual(defaults, [DEFAULT_LOCALE]);
    assert.equal(DEFAULT_LOCALE, "en");
    assert.equal(LOCALES.en.prefix, "");
  });

  it("路径前缀互不重复", () => {
    const prefixes = LOCALE_CODES.map((code) => LOCALES[code].prefix);
    assert.equal(new Set(prefixes).size, prefixes.length);
  });

  it("中文与日语分别落在 /zh 与 /ja，且不存在 /en 前缀", () => {
    assert.equal(LOCALES["zh-CN"].prefix, "/zh");
    assert.equal(LOCALES.ja.prefix, "/ja");
    const prefixes = LOCALE_CODES.map((code) => LOCALES[code].prefix);
    assert.ok(!prefixes.includes("/en"), "英语不应有 /en 前缀");
  });

  it("每种语言的必备字段非空", () => {
    for (const code of LOCALE_CODES) {
      const locale = LOCALES[code];
      assert.equal(locale.code, code, `${code} 的 code 应与键一致`);
      for (const field of [
        "displayName",
        "htmlLang",
        "ogLocale",
        "hreflang",
      ] as const) {
        assert.ok(
          locale[field].length > 0,
          `${code} 的 ${field} 不应为空`,
        );
      }
    }
  });

  it("本地存储键与主题键同前缀但不相同", () => {
    assert.equal(LOCALE_STORAGE_KEY, "offline-tools-locale");
    assert.notEqual(LOCALE_STORAGE_KEY, "offline-tools-theme");
  });

  it("isLocaleCode 只接受已知语言码", () => {
    assert.equal(isLocaleCode("en"), true);
    assert.equal(isLocaleCode("zh-CN"), true);
    assert.equal(isLocaleCode("ja"), true);
    assert.equal(isLocaleCode("zh"), false);
    assert.equal(isLocaleCode("fr"), false);
    assert.equal(isLocaleCode(""), false);
    assert.equal(isLocaleCode(null), false);
    assert.equal(isLocaleCode(undefined), false);
  });

  it("localeForPrefix 整段匹配，不做近似匹配", () => {
    // 空串不匹配任何语言：英语 prefix 是 ""，但「没有前缀」不等于
    // 「路径指定了英语」—— 见 locales.ts 的注释与 resolveLocale 的用例。
    assert.equal(localeForPrefix(""), null);
    assert.equal(localeForPrefix("/zh"), "zh-CN");
    assert.equal(localeForPrefix("/ja"), "ja");
    // 形似但不是语言前缀的取值不得命中 —— 否则 /zhx 会被当作中文
    assert.equal(localeForPrefix("/zhx"), null);
    assert.equal(localeForPrefix("/fr"), null);
    assert.equal(localeForPrefix("/en"), null);
    assert.equal(localeForPrefix("zh"), null);
  });

  it("不 import React、不触碰浏览器全局（构建期可加载）", async () => {
    const source = await readFile(
      new URL("./locales.ts", import.meta.url),
      "utf8",
    );
    // vite.config.ts 在 Node 构建期直接 import 本模块；引入 React 或浏览器
    // 全局会让构建在加载阶段失败，因此把这条约束固化在测试里。
    //
    // 必须先剥掉注释再扫描：本模块的注释里就写着 window/document/navigator
    // 这些词（说明为什么不能用它们），直接全文匹配会把文档当成违规。
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/[^\n]*/g, " ");

    assert.doesNotMatch(code, /from\s+["']react["']/, "不得 import React");
    for (const global of [
      "window",
      "document",
      "navigator",
      "localStorage",
    ]) {
      assert.doesNotMatch(
        code,
        new RegExp(`\\b${global}\\b`),
        `不得引用浏览器全局 ${global}`,
      );
    }
  });
});

describe("resolveLocale 解析优先级", () => {
  it("路径前缀优先于已保存偏好", () => {
    assert.equal(
      resolveLocale({ pathname: "/zh/video-frame/", stored: "ja" }),
      "zh-CN",
    );
    assert.equal(
      resolveLocale({ pathname: "/ja/video-frame/", stored: "zh-CN" }),
      "ja",
    );
    assert.equal(
      resolveLocale({ pathname: "/zh/id-photo/", stored: "en" }),
      "zh-CN",
    );
  });

  it("根路径不是显式语言指定，已保存偏好仍然生效", () => {
    // 关键区分：`/zh`、`/ja` 是「路径明确指定」；`/` 是**隐式**的默认落点。
    // 因此访问 `/` 时已保存偏好优先 —— 否则「切换到日语后重新打开站点
    // 仍是日语」无法成立（i18n spec 的「语言在跳转与再次访问间保持」）。
    assert.equal(resolveLocale({ pathname: "/", stored: "ja" }), "ja");
    assert.equal(resolveLocale({ pathname: "/", stored: "zh-CN" }), "zh-CN");
    assert.equal(resolveLocale({ pathname: "/", stored: "en" }), "en");
    assert.equal(localeExplicitInPath("/"), false);
  });

  it("无路径前缀且无偏好时按 navigator.language 匹配", () => {
    assert.equal(
      resolveLocale({ pathname: "/", navigatorLanguage: "ja" }),
      "ja",
    );
    assert.equal(
      resolveLocale({ pathname: "/", navigatorLanguage: "en-US" }),
      "en",
    );
    assert.equal(
      resolveLocale({ pathname: "/", navigatorLanguage: "zh-CN" }),
      "zh-CN",
    );
    assert.equal(
      resolveLocale({ pathname: "/", navigatorLanguage: "zh-TW" }),
      "zh-CN",
    );
  });

  it("路径命中前缀时带或不带尾部斜杠都识别", () => {
    assert.equal(resolveLocale({ pathname: "/zh" }), "zh-CN");
    assert.equal(resolveLocale({ pathname: "/zh/" }), "zh-CN");
    assert.equal(resolveLocale({ pathname: "/ja" }), "ja");
    assert.equal(resolveLocale({ pathname: "/ja/" }), "ja");
    assert.equal(resolveLocale({ pathname: "/ja/id-photo/" }), "ja");
  });

  it("形似前缀与不支持的语言不被当作语言前缀", () => {
    // /zhx 不是 /zh：整段匹配，不得吞掉
    assert.equal(
      resolveLocale({ pathname: "/zhx/video-frame/", stored: "ja" }),
      "ja",
    );
    assert.equal(
      resolveLocale({ pathname: "/fr/video-frame/", stored: "ja" }),
      "ja",
    );
    assert.equal(
      resolveLocale({ pathname: "/en/video-frame/", stored: "ja" }),
      "ja",
    );
  });

  it("navigator 语言不在支持集合内时回退英语", () => {
    assert.equal(
      resolveLocale({ pathname: "/", navigatorLanguage: "fr-FR" }),
      "en",
    );
    assert.equal(resolveLocale({ pathname: "/", navigatorLanguage: "" }), "en");
  });

  it("全部来源缺失时回退英语（默认语言）", () => {
    assert.equal(resolveLocale({ pathname: "/" }), "en");
    assert.equal(
      resolveLocale({ pathname: "/", stored: null, navigatorLanguage: null }),
      "en",
    );
    assert.equal(
      resolveLocale({ pathname: "/", stored: "fr", navigatorLanguage: "de" }),
      "en",
    );
  });

  it("非法的已保存偏好被忽略，不抛错", () => {
    assert.equal(resolveLocale({ pathname: "/", stored: "fr" }), "en");
    assert.equal(resolveLocale({ pathname: "/", stored: "" }), "en");
    assert.equal(resolveLocale({ pathname: "/", stored: "zh" }), "en");
  });

  it("路径优先级高于 navigator", () => {
    assert.equal(
      resolveLocale({ pathname: "/zh/", navigatorLanguage: "ja" }),
      "zh-CN",
    );
    assert.equal(
      resolveLocale({ pathname: "/ja/", navigatorLanguage: "en-US" }),
      "ja",
    );
  });

  it("localeExplicitInPath 只在路径真的带语言前缀时为真", () => {
    assert.equal(localeExplicitInPath("/zh/"), true);
    assert.equal(localeExplicitInPath("/ja/video-frame/"), true);
    assert.equal(localeExplicitInPath("/"), false);
    assert.equal(localeExplicitInPath("/video-frame/"), false);
    assert.equal(localeExplicitInPath("/fr/video-frame/"), false);
  });
});

describe("localeExplicitInPath 与偏好写入的边界", () => {
  it("只有带语言前缀的路径才算「显式指定」", () => {
    // 这决定了「访问 / 是否改写偏好」：隐式路径不得改写，
    // 否则默认语言会把所有人的偏好刷成英语。
    assert.equal(localeExplicitInPath("/"), false);
    assert.equal(localeExplicitInPath("/video-frame/"), false);
    assert.equal(localeExplicitInPath("/zh/"), true);
    assert.equal(localeExplicitInPath("/ja/video-frame/"), true);
  });
});
