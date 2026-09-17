import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ANALYTICS_ID_TOKEN,
  ANALYTICS_META_NAME,
  ANALYTICS_SCRIPT_HOST,
} from "../src/lib/analytics.ts";
import { siteUrl } from "../vite.config.ts";

/**
 * 产物契约：百度统计接入。
 *
 * 断言依据单一来源（`src/lib/analytics.ts` 与构建期的 `resolveAnalyticsId`），
 * 不复制标识字面量 —— 换统计站点只需改单一来源或构建环境变量，本文件无需同步修改。
 *
 * 这里刻意把两类断言放在一起，因为它们互为约束：标识必须出现在 HTML（统计要能用），
 * 统计端点必须不出现在 Service Worker 与预缓存清单（离线可用性不能被第三方脚本拖累）。
 */

const distRoot = new URL("../dist/", import.meta.url);

/** 六个 HTML 入口：文件 -> 自身路由。 */
const PAGES = [
  "index.html",
  "video-frame/index.html",
  "video-compress/index.html",
  "image-compress/index.html",
  "image-watermark/index.html",
  "image-a4-layout/index.html",
];

/** 预期注入的标识：与构建期解析规则一致（环境变量优先，否则内置默认值）。 */
const expectedSiteId = (process.env.VITE_ANALYTICS_ID ?? "").trim();

test("六个 HTML 入口都携带注入后的统计站点标识", async () => {
  for (const file of PAGES) {
    const html = await readFile(new URL(file, distRoot), "utf8");
    const content = html.match(
      new RegExp(`<meta[^>]*name="${ANALYTICS_META_NAME}"[^>]*content="([^"]*)"`),
    )?.[1];

    assert.ok(content !== undefined, `${file} 缺少 ${ANALYTICS_META_NAME} meta`);
    assert.notEqual(content, "", `${file} 的统计标识为空`);
    if (expectedSiteId !== "") {
      assert.equal(content, expectedSiteId, `${file} 的统计标识与构建配置不一致`);
    }
    assert.match(content, /^[0-9a-f]{16,64}$/i, `${file} 的统计标识格式不合法`);
  }
});

test("六个 HTML 入口不残留未替换的统计标识占位符", async () => {
  for (const file of PAGES) {
    const html = await readFile(new URL(file, distRoot), "latin1");
    assert.ok(
      !html.includes(ANALYTICS_ID_TOKEN),
      `产物 ${file} 残留未替换的占位符 ${ANALYTICS_ID_TOKEN}`,
    );
  }
});

test("统计脚本不进入 Service Worker 预缓存清单", async () => {
  const sw = await readFile(new URL("sw.js", distRoot), "utf8");

  assert.ok(
    !sw.includes(ANALYTICS_SCRIPT_HOST),
    `sw.js 不应包含统计端点 ${ANALYTICS_SCRIPT_HOST}`,
  );
  assert.ok(!/hm\.js/.test(sw), "sw.js 不应引用 hm.js");
  assert.ok(
    !/runtimeCaching/i.test(sw) || !sw.includes("baidu"),
    "sw.js 不应为统计端点配置运行时缓存",
  );
});

test("manifest 与预缓存入口不含统计端点", async () => {
  const manifest = await readFile(new URL("manifest.webmanifest", distRoot), "utf8");
  assert.ok(!manifest.includes(ANALYTICS_SCRIPT_HOST));

  const sw = await readFile(new URL("sw.js", distRoot), "utf8");
  const precacheEntries = [...sw.matchAll(/\{url:"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(precacheEntries.length > 0, "预缓存清单为空，断言失去意义");
  for (const entry of precacheEntries) {
    assert.ok(
      !entry.includes(ANALYTICS_SCRIPT_HOST),
      `预缓存清单不应包含统计资源：${entry}`,
    );
  }
});

test("统计标识只由站点自身来源注入，不引入第二条通道", async () => {
  const html = await readFile(new URL("index.html", distRoot), "utf8");

  // 统计脚本由客户端在满足加载门后动态插入，HTML 里不应有静态 script 标签
  assert.ok(
    !/<script[^>]+hm\.baidu\.com/.test(html),
    "统计脚本必须由加载门动态插入，而不是写死在 HTML 里",
  );
  // og:url 等站点地址仍然只指向站点自身
  assert.ok(html.includes(`${siteUrl}/`), "站点自身地址应仍然存在");
});
