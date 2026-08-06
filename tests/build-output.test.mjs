import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("build emits a static offline SPA and hosting adapter", async () => {
  const [html, manifest, packageJson] = await Promise.all([
    readFile(new URL("dist/client/index.html", root), "utf8"),
    readFile(new URL("dist/client/manifest.webmanifest", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    access(new URL("dist/client/sw.js", root)),
    access(new URL("dist/client/pwa-192.png", root)),
    access(new URL("dist/client/pwa-512.png", root)),
    access(new URL("dist/server/index.js", root)),
    access(new URL("dist/.openai/hosting.json", root)),
  ]);

  assert.match(html, /<html lang="zh-CN"/i);
  assert.match(html, /帧切 · 离线视频取帧/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /id="root"/);
  assert.doesNotMatch(html, /__next|_rsc|vinext/i);

  const parsedManifest = JSON.parse(manifest);
  assert.equal(parsedManifest.name, "帧切 · 离线视频取帧");
  assert.equal(parsedManifest.display, "standalone");
  assert.equal(parsedManifest.theme_color, "#111110");

  assert.doesNotMatch(packageJson, /next|vinext|react-server-dom-webpack/i);
});
