import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { ANALYTICS_META_NAME } from "../src/lib/analytics.ts";
import { SITE_URL } from "../src/lib/site.ts";
import { allEntryCombinations } from "../src/lib/i18n/entry-html.ts";
import { LOCALES } from "../src/lib/i18n/locales.ts";
import { seoContentFor, seoPathFor } from "../src/lib/i18n/seo-content.ts";

const root = new URL("../", import.meta.url);

/** 该入口在 dist 中的 HTML 路径：URL 路径 -> `<路径>/index.html`。 */
const distFileFor = (urlPath) =>
  `dist/${[...urlPath.split("/").filter(Boolean), "index.html"].join("/")}`;

const ENTRIES = allEntryCombinations();

const readDist = (path) => readFile(new URL(path, root), "utf8");

test("build emits a static offline multi-page app", async () => {
  const [manifest, packageJson, robots, sitemap] = await Promise.all([
    readDist("dist/manifest.webmanifest"),
    readDist("package.json"),
    readDist("dist/robots.txt"),
    readDist("dist/sitemap.xml"),
  ]);

  // 全部 21 个「语言 × 工具」入口都必须存在
  assert.equal(ENTRIES.length, 21, "应有 21 个语言化入口");
  for (const entry of ENTRIES) {
    await access(new URL(distFileFor(entry.path), root));
  }

  await Promise.all([
    access(new URL("dist/sw.js", root)),
    access(new URL("dist/pwa-192.png", root)),
    access(new URL("dist/pwa-512.png", root)),
    access(new URL("dist/pwa-maskable-512.png", root)),
    access(new URL("dist/assets/image-compress-worker.js", root)),
    access(new URL("dist/legal/LICENSE.txt", root)),
    access(new URL("dist/legal/THIRD_PARTY_NOTICES.md", root)),
    access(new URL("dist/legal/CORRESPONDING_SOURCE.md", root)),
  ]);

  // 每个入口的语言、标题与必需 head 元素由语言数据源驱动 ——
  // 新增语言时本测试无需改写任何字面量，只跟随数据源。
  for (const entry of ENTRIES) {
    const html = await readDist(distFileFor(entry.path));
    const locale = LOCALES[entry.locale];
    const content = seoContentFor(entry.locale, entry.route);
    const where = `${entry.locale} × ${entry.route}`;

    assert.match(
      html,
      new RegExp(`<html lang="${locale.htmlLang}"`, "i"),
      `${where} 的 lang 应为 ${locale.htmlLang}`,
    );
    assert.ok(
      html.includes(`<title>${content.title}</title>`),
      `${where} 的标题应取自该语言数据源`,
    );
    assert.ok(
      html.includes(`property="og:locale" content="${locale.ogLocale}"`),
      `${where} 的 og:locale 应为 ${locale.ogLocale}`,
    );
    assert.match(html, /manifest\.webmanifest/);
    assert.match(html, /id="root"/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /name="keywords"/);
    assert.match(html, /name="robots"/);
    assert.match(html, /property="og:url"/);
    assert.match(html, /name="twitter:title"/);
    assert.match(html, /id="structured-data" type="application\/ld\+json"/);
    // 统计站点标识由构建期注入（加载门在客户端；详见 tests/analytics-embed.test.mjs）
    assert.match(
      html,
      new RegExp(`<meta name="${ANALYTICS_META_NAME}" content="[0-9a-f]{16,64}"`),
    );
    assert.doesNotMatch(html, /__next|_rsc|vinext|#\/(video|image)/i);
    // 生成器不得把未替换的占位符留下
    assert.doesNotMatch(html, /__SITE_URL__|__ANALYTICS_ID__|__ENTRY_MODULE__/);

    // canonical 与 og:url 指向自身语言的规范路径
    const canonicalUrl = `${SITE_URL}${seoPathFor(entry.locale, entry.route)}`;
    const canonicalTag =
      html.match(/<link[^>]*rel="canonical"[^>]*\/?>/)?.[0] ?? "";
    assert.equal(
      canonicalTag.match(/href="([^"]+)"/)?.[1],
      canonicalUrl,
      `${where} 的 canonical`,
    );
    const ogUrlTag =
      html.match(/<meta[^>]*property="og:url"[^>]*\/?>/)?.[0] ?? "";
    assert.equal(
      ogUrlTag.match(/content="([^"]+)"/)?.[1],
      canonicalUrl,
      `${where} 的 og:url`,
    );
  }

  assert.match(robots, /^User-agent: \*/m);
  assert.match(robots, /Sitemap: .*\/sitemap\.xml/);

  // sitemap 需覆盖全部 21 个语言化路径
  for (const entry of ENTRIES) {
    assert.match(
      sitemap,
      new RegExp(`<loc>[^<]+${seoPathFor(entry.locale, entry.route)}</loc>`),
      `sitemap 缺少 ${entry.locale} × ${entry.route}`,
    );
  }

  const parsedManifest = JSON.parse(manifest);
  assert.equal(parsedManifest.display, "standalone");
  assert.equal(parsedManifest.theme_color, "#000000");
  assert.ok(
    typeof parsedManifest.name === "string" && parsedManifest.name.length > 0,
    "manifest 应有名称",
  );
  // manifest 只声明**默认语言**（每次安装一份）：与根路径的英语默认一致。
  // 安装后打开时，已保存的偏好在首帧前生效，用户仍看到自己选择的语言。
  assert.equal(
    parsedManifest.lang,
    "en",
    "manifest 的语言应为默认语言（英语），与根路径一致",
  );
  assert.equal(
    parsedManifest.name,
    seoContentFor("en", "home").applicationNameJsonLd + " · Frame extraction and image processing",
    "manifest 名称应取自默认语言",
  );
  assert.ok(
    !/[\u4e00-\u9fff]/.test(parsedManifest.name),
    "manifest 名称不应含中文（默认语言是英语）",
  );

  // 防护「Next.js / vinext / 边缘运行时」回流。用依赖名精确匹配而非子串:
  // `next-themes` 是 shadcn 主题方案的正规依赖,不应被 /next/ 误伤。
  const parsedPackage = JSON.parse(packageJson);
  const declared = Object.keys({
    ...parsedPackage.dependencies,
    ...parsedPackage.devDependencies,
  });
  const forbidden = declared.filter((name) =>
    /^(next|vinext|react-server-dom-webpack|wrangler|workerd)$/i.test(name) ||
    name.startsWith("@cloudflare/"),
  );
  assert.deepEqual(
    forbidden,
    [],
    `以下依赖属于已迁出的框架/运行时,不应回流: ${forbidden.join(", ")}`,
  );

  await Promise.all([
    assert.rejects(access(new URL("dist/server/index.js", root))),
    assert.rejects(access(new URL("dist/.openai/hosting.json", root))),
  ]);
});
/**
 * 离线兜底的边界：语言前缀下的路径不得被交付为另一种语言。
 *
 * `navigateFallback: "/index.html"` 会把未匹配的导航交给**英语首页**。若不排除
 * `/zh/` 与 `/ja/`，访问 `/ja/does-not-exist/` 会得到英语页面、地址栏却停在
 * `/ja/…` —— 与「路径前缀决定语言」冲突（spec: 语言解析）。
 */
test("service worker 的离线兜底排除语言前缀路径", async () => {
  const sw = await readFile(new URL("dist/sw.js", root), "utf8");

  // 兜底目标仍是英语首页（无前缀路径的预期行为）
  assert.ok(
    sw.includes('createHandlerBoundToURL("/index.html")'),
    "无前缀路径仍应有离线兜底",
  );

  // 两种语言前缀都必须出现在 denylist 里（workbox 序列化为 ^\/zh\/ 这种字面量）
  for (const prefix of ["zh", "ja"]) {
    assert.ok(
      sw.includes(`^\\/${prefix}\\/`),
      `离线兜底应排除 /${prefix}/ 下的路径（实际未见 ^\\/${prefix}\\/ ）`,
    );
  }
  // /legal/ 的既有排除不能被移除
  assert.ok(sw.includes("^\\/legal\\/"), "既有的 /legal/ 排除应保留");
});
