import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCALE_STORAGE_KEY } from "./locales";
import {
  readStoredLocale,
  resolveInitialLocale,
  writeStoredLocale,
  type LocaleStorage,
} from "./locale-context";

/** 假的存储：记录写入，用于验证「何时写、写了什么」。 */
const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  const writes: Array<[string, string]> = [];
  const storage: LocaleStorage = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
      writes.push([key, value]);
    },
  };
  return { storage, writes, data };
};

describe("语言偏好的保存（6.2 / i18n spec）", () => {
  it("路径显式带语言前缀时写入偏好", () => {
    const { storage, writes } = fakeStorage();
    resolveInitialLocale("/ja/video-compress/", null, null, storage);
    assert.deepEqual(writes, [[LOCALE_STORAGE_KEY, "ja"]]);
  });

  it("无前缀路径不写入偏好（否则默认语言会刷掉所有人的偏好）", () => {
    const { storage, writes } = fakeStorage();
    resolveInitialLocale("/", "ja", null, storage);
    resolveInitialLocale("/video-frame/", "zh-CN", null, storage);
    assert.deepEqual(writes, [], "隐式路径不得改写偏好");
  });

  it("外部直链的语言被写入偏好（链接即选择）", () => {
    const { storage, writes } = fakeStorage();
    // 已保存偏好是英语，但链接指向 /ja/ → 偏好应更新为日语
    const resolved = resolveInitialLocale("/ja/", "en", "en-US", storage);
    assert.equal(resolved, "ja", "路径优先于已保存偏好");
    assert.deepEqual(writes, [[LOCALE_STORAGE_KEY, "ja"]]);
  });

  it("显式切换语言时写入偏好（三种语言一视同仁，含英语）", () => {
    for (const locale of ["en", "zh-CN", "ja"] as const) {
      const { storage, writes } = fakeStorage();
      writeStoredLocale(locale, storage);
      assert.deepEqual(
        writes,
        [[LOCALE_STORAGE_KEY, locale]],
        `${locale} 应被写入偏好`,
      );
      assert.equal(readStoredLocale(storage), locale);
    }
  });

  it("存储不可用时静默降级，不抛错", () => {
    const throwing: LocaleStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(readStoredLocale(throwing), null);
    assert.doesNotThrow(() => writeStoredLocale("ja", throwing));
    assert.doesNotThrow(() =>
      resolveInitialLocale("/ja/", null, null, throwing),
    );
  });

  it("传 null 存储（SSR）时不抛错", () => {
    assert.equal(readStoredLocale(null), null);
    assert.doesNotThrow(() => writeStoredLocale("ja", null));
    assert.equal(resolveInitialLocale("/zh/", null, null, null), "zh-CN");
  });

  it("偏好键与主题键不同（互不覆盖）", () => {
    const { storage, data } = fakeStorage({ "offline-tools-theme": "light" });
    writeStoredLocale("ja", storage);
    assert.equal(data["offline-tools-theme"], "light", "主题键不应被改动");
    assert.equal(data[LOCALE_STORAGE_KEY], "ja");
  });
});
