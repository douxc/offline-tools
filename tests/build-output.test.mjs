import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("build emits a static offline multi-page app", async () => {
  const [
    homeHtml,
    videoHtml,
    videoCompressHtml,
    compressHtml,
    watermarkHtml,
    a4LayoutHtml,
    manifest,
    packageJson,
    robots,
    sitemap,
  ] = await Promise.all([
    readFile(new URL("dist/index.html", root), "utf8"),
    readFile(new URL("dist/video-frame/index.html", root), "utf8"),
    readFile(new URL("dist/video-compress/index.html", root), "utf8"),
    readFile(new URL("dist/image-compress/index.html", root), "utf8"),
    readFile(new URL("dist/image-watermark/index.html", root), "utf8"),
    readFile(new URL("dist/image-a4-layout/index.html", root), "utf8"),
    readFile(new URL("dist/manifest.webmanifest", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("dist/robots.txt", root), "utf8"),
    readFile(new URL("dist/sitemap.xml", root), "utf8"),
    access(new URL("dist/sw.js", root)),
    access(new URL("dist/pwa-192.png", root)),
    access(new URL("dist/pwa-512.png", root)),
    access(new URL("dist/pwa-maskable-512.png", root)),
    access(new URL("dist/assets/image-compress-worker.js", root)),
    access(new URL("dist/legal/LICENSE.txt", root)),
    access(new URL("dist/legal/THIRD_PARTY_NOTICES.md", root)),
    access(new URL("dist/legal/CORRESPONDING_SOURCE.md", root)),
  ]);

  const pages = [homeHtml, videoHtml, videoCompressHtml, compressHtml, watermarkHtml, a4LayoutHtml];
  for (const html of pages) {
    assert.match(html, /<html lang="zh-CN"/i);
    assert.match(html, /manifest\.webmanifest/);
    assert.match(html, /id="root"/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /name="keywords"/);
    assert.match(html, /name="robots"/);
    assert.match(html, /property="og:url"/);
    assert.match(html, /name="twitter:title"/);
    assert.match(html, /id="structured-data" type="application\/ld\+json"/);
    assert.doesNotMatch(html, /__next|_rsc|vinext|#\/(video|image)/i);
  }

  assert.match(
    homeHtml,
    /<title>离线工具箱｜在线视频取帧、图片压缩与图片加水印<\/title>/,
  );
  assert.match(
    videoHtml,
    /<title>视频取帧工具｜在线逐帧截图、视频转图片 - 离线工具<\/title>/,
  );
  assert.match(
    videoCompressHtml,
    /<title>[^<]*视频压缩[^<]*<\/title>/,
  );
  assert.match(
    compressHtml,
    /<title>在线图片压缩工具｜批量压缩 PNG、JPG、WebP - 离线工具<\/title>/,
  );
  assert.match(
    watermarkHtml,
    /<title>图片加水印工具｜在线批量添加文字水印 - 离线工具<\/title>/,
  );
  assert.match(
    a4LayoutHtml,
    /<title>图片 A4 排版打印工具｜批量排版照片打印 - 离线工具<\/title>/,
  );
  const a4CanonicalTag =
    a4LayoutHtml.match(/<link[^>]*rel="canonical"[^>]*\/?>/)?.[0] ?? "";
  assert.match(
    a4CanonicalTag,
    /href="https:\/\/framecut-offline\.douxc512\.chatgpt\.site\/image-a4-layout\/"/,
  );
  const a4OgUrlTag =
    a4LayoutHtml.match(/<meta[^>]*property="og:url"[^>]*\/?>/)?.[0] ?? "";
  assert.match(
    a4OgUrlTag,
    /content="https:\/\/framecut-offline\.douxc512\.chatgpt\.site\/image-a4-layout\/"/,
  );
  assert.match(robots, /^User-agent: \*/m);
  assert.match(robots, /Sitemap: .*\/sitemap\.xml/);
  for (const path of [
    "/video-frame/",
    "/video-compress/",
    "/image-compress/",
    "/image-watermark/",
    "/image-a4-layout/",
  ]) {
    assert.match(sitemap, new RegExp(`<loc>[^<]+${path}</loc>`));
  }

  const parsedManifest = JSON.parse(manifest);
  assert.equal(parsedManifest.name, "离线工具 · 视频取帧与图片处理");
  assert.equal(parsedManifest.display, "standalone");
  assert.equal(parsedManifest.theme_color, "#000000");

  assert.doesNotMatch(
    packageJson,
    /next|vinext|react-server-dom-webpack|cloudflare|wrangler|workerd/i,
  );

  await Promise.all([
    assert.rejects(access(new URL("dist/server/index.js", root))),
    assert.rejects(access(new URL("dist/.openai/hosting.json", root))),
  ]);
});
