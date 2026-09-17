import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SITE_URL, SITE_URL_TOKEN } from "../src/lib/site.ts";

/**
 * 产物契约：站点绝对 URL 的一致性。
 *
 * 断言依据 src/lib/site.ts 的单一来源，不写域名副本 —— 换域名只需改单一来源，
 * 本文件无需同步修改。唯一保留的字面量是「废弃 host 清单」：它表达的是历史上
 * 用过、不得再回流的 host，随域名迁移增长，而不是需要替换的重复值。
 *
 * 扫描范围限定为承载站点自身 SEO 地址的产物（HTML 入口、sitemap、robots、
 * manifest）。框架与第三方资源（Rolldown chunk、workbox、许可文本）内部含有
 * react.dev / tailwindcss.com 等说明性链接，不属于站点地址，全产物扫描会把它们
 * 误判为不一致。
 */

/** 曾经用于生产、现已废弃的 host，不允许再出现在产物中。 */
const DEPRECATED_HOSTS = ["framecut-offline.douxc512.chatgpt.site"];

const distRoot = new URL("../dist/", import.meta.url);
const expectedHost = new URL(SITE_URL).host;

/** 六个 HTML 入口：文件 -> 自身路由。 */
const PAGES = [
  ["index.html", "/"],
  ["video-frame/index.html", "/video-frame/"],
  ["video-compress/index.html", "/video-compress/"],
  ["image-compress/index.html", "/image-compress/"],
  ["image-watermark/index.html", "/image-watermark/"],
  ["image-a4-layout/index.html", "/image-a4-layout/"],
];

const SEO_ARTIFACTS = [
  ...PAGES.map(([file]) => file),
  "sitemap.xml",
  "robots.txt",
  "manifest.webmanifest",
];

/**
 * 取出文本中全部绝对 URL 的 host。
 *
 * 用 URL 解析而非纯正则，因为同一行可能存在多个 URL，正则的字符类会把引号与
 * 尾部标点一并吞掉（例如 `"https://schema.org/","name":"…"`）。这里对每个候选
 * 取「首个能成功解析的前缀」，并把无法解析的片段（内联 JS 中被拼接或转义的
 * 地址）跳过。
 */
const hostsIn = (text) => {
  const hosts = new Set();
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>()\\]+/g)) {
    for (let end = match[0].length; end > "https://".length; end -= 1) {
      try {
        hosts.add(new URL(match[0].slice(0, end)).host);
        break;
      } catch {
        // 继续截短重试
      }
    }
  }
  return hosts;
};

test("承载站点地址的产物中，绝对 URL 的 host 唯一且等于单一来源", async () => {
  const found = new Set();
  for (const file of SEO_ARTIFACTS) {
    const text = await readFile(new URL(file, distRoot), "utf8");
    for (const host of hostsIn(text)) found.add(host);
  }
  // 格式要求的命名空间与词汇表标识，不是站点地址
  found.delete("www.sitemaps.org"); // sitemap.xml 的 XML 命名空间
  found.delete("schema.org"); // JSON-LD 的 @context
  assert.deepEqual(
    [...found],
    [expectedHost],
    `非预期的绝对 URL host：${[...found].join(", ")}`,
  );
});

test("产物中不出现历史废弃 host", async () => {
  const contents = await Promise.all(
    SEO_ARTIFACTS.map(async (file) => [
      file,
      await readFile(new URL(file, distRoot), "latin1"),
    ]),
  );
  for (const [file, text] of contents) {
    for (const host of DEPRECATED_HOSTS) {
      assert.ok(!text.includes(host), `产物 ${file} 残留废弃 host ${host}`);
    }
  }
});

test("站点地址产物中不残留未替换的占位符", async () => {
  for (const file of SEO_ARTIFACTS) {
    const text = await readFile(new URL(file, distRoot), "latin1");
    assert.ok(
      !text.includes(SITE_URL_TOKEN),
      `产物 ${file} 残留未替换的占位符 ${SITE_URL_TOKEN}`,
    );
  }
});

test("六个入口的 canonical 与 og:url 指向自身路径", async () => {
  for (const [file, routePath] of PAGES) {
    const html = await readFile(new URL(file, distRoot), "utf8");
    const canonical = html.match(
      /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/,
    )?.[1];
    const ogUrl = html.match(
      /<meta[^>]*property="og:url"[^>]*content="([^"]+)"/,
    )?.[1];
    assert.equal(canonical, `${SITE_URL}${routePath}`, `${file} canonical`);
    assert.equal(ogUrl, `${SITE_URL}${routePath}`, `${file} og:url`);
  }
});

test("sitemap 与 robots 使用单一来源的 host", async () => {
  const sitemap = await readFile(new URL("sitemap.xml", distRoot), "utf8");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, 6, "sitemap 应有 6 条条目");
  for (const loc of locs) assert.equal(new URL(loc).host, expectedHost, loc);

  const robots = await readFile(new URL("robots.txt", distRoot), "utf8");
  const sitemapLine = robots.match(/^Sitemap: (.+)$/m)?.[1];
  assert.ok(sitemapLine, "robots.txt 缺少 Sitemap 声明");
  assert.equal(new URL(sitemapLine).host, expectedHost);
});

test("注入结果先于预缓存修订号计算（否则预缓存会失配）", async () => {
  const sw = await readFile(new URL("sw.js", distRoot), "utf8");
  const revisions = new Map(
    [...sw.matchAll(/\{url:"([^"]+)",revision:"([^"]+)"\}/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  // 站点 URL 注入会改写这些文本文件。若改写发生在 vite-plugin-pwa 计算修订号
  // 之后，清单中的 revision 将与产物实际内容不符，预缓存安装失败 —— 浏览器会
  // 因内容校验不通过而拒绝缓存这些文件。
  //
  // 注意本断言验证的是「注入结果 + 修订号」这条链的一致性，不区分两层注入机制
  // 中是哪一层生效；主机制若静默失效，构建期会由插件的兜底告警指出。
  const injected = ["robots.txt", ...PAGES.map(([file]) => file)];
  for (const file of injected) {
    assert.ok(revisions.has(file), `预缓存清单缺少 ${file}`);
    const actual = createHash("md5")
      .update(await readFile(new URL(file, distRoot)))
      .digest("hex");
    assert.equal(revisions.get(file), actual, `${file} 的预缓存修订号不一致`);
  }
});
