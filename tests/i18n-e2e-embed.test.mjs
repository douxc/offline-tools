import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { allEntryCombinations } from "../src/lib/i18n/entry-html.ts";
import { LOCALES } from "../src/lib/i18n/locales.ts";
import { seoContentFor, seoPathFor } from "../src/lib/i18n/seo-content.ts";
import { SITE_URL } from "../src/lib/site.ts";

/**
 * 端到端验收（8.1 / 8.2）：用**真实 HTTP**把 `dist/` 当作静态站点提供，
 * 逐个请求 21 条语言入口。
 *
 * 为什么不用「读 dist 文件」代替：spec 的验收点是**请求行为** —— 外部直链
 * 到达后是否发生重定向、返回的 HTML 是否就是该语言的版本。读文件无法覆盖
 * 「有没有发 301/302」，因此这里起一个真实服务器并跟到底。
 *
 * 服务器只做静态托管（目录 -> index.html），与部署形态一致：站点是纯静态产物，
 * 不需要任何 rewrite 规则。
 */

const distRoot = new URL("../dist/", import.meta.url).pathname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const serveStatic = async (urlPath) => {
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let file = path.join(distRoot, safe);
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
  } catch {
    return null;
  }
  try {
    const body = await readFile(file);
    return { body, type: MIME[path.extname(file)] ?? "application/octet-stream" };
  } catch {
    return null;
  }
};

let server;
let origin;

before(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const found = await serveStatic(decodeURIComponent(url.pathname));
    if (!found) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": found.type });
    res.end(found.body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const ENTRIES = allEntryCombinations();

describe("8.1 外部直链：21 条 URL 直达且语言正确", () => {
  it("21 条语言入口全部返回 200 且不重定向", async () => {
    assert.equal(ENTRIES.length, 21);
    for (const entry of ENTRIES) {
      const response = await fetch(`${origin}${entry.path}`, {
        redirect: "manual",
      });
      assert.equal(
        response.status,
        200,
        `${entry.path} 应为 200（不得重定向）`,
      );
      // 3xx 会在 redirect:"manual" 下作为状态码出现，上面已排除；
      // 这里再确认没有 location 头，避免「200 + 客户端跳转」的写法漏网
      assert.equal(
        response.headers.get("location"),
        null,
        `${entry.path} 不应带 location 头`,
      );
    }
  });

  it("返回的 HTML 语言与路径所属语言一致", async () => {
    for (const entry of ENTRIES) {
      const html = await (await fetch(`${origin}${entry.path}`)).text();
      const { htmlLang } = LOCALES[entry.locale];
      assert.match(
        html,
        new RegExp(`<html lang="${htmlLang}"`),
        `${entry.path} 的 lang 应为 ${htmlLang}`,
      );
      assert.ok(
        html.includes(`<title>${seoContentFor(entry.locale, entry.route).title}</title>`),
        `${entry.path} 的标题应取自 ${entry.locale}`,
      );
    }
  });

  it("canonical 自指且等于该语言的规范路径", async () => {
    for (const entry of ENTRIES) {
      const html = await (await fetch(`${origin}${entry.path}`)).text();
      const canonical = html.match(
        /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/,
      )?.[1];
      assert.equal(
        canonical,
        `${SITE_URL}${seoPathFor(entry.locale, entry.route)}`,
        `${entry.path} 的 canonical`,
      );
    }
  });

  it("传入语言不被偏好覆盖：HTML 本身已是对应语言（无需脚本改写）", async () => {
    // 关键性质：语言由**服务端返回的静态 HTML** 决定，因此不存在
    // 「先返回默认语言，再由脚本改」的窗口。逐条比对标题即可证明。
    const ja = await (await fetch(`${origin}/ja/image-compress/`)).text();
    assert.ok(
      ja.includes(seoContentFor("ja", "image-compress").title),
      "日语路径应直接返回日语标题",
    );
    assert.ok(
      !ja.includes(seoContentFor("en", "image-compress").title),
      "日语页面不应包含英语标题",
    );
    assert.ok(
      !ja.includes(seoContentFor("zh-CN", "image-compress").title),
      "日语页面不应包含中文标题",
    );
  });
});

describe("8.2 跨页面与跨会话的语言保持", () => {
  it("每个语言入口内嵌的 hreflang 互指覆盖三种语言 + x-default", async () => {
    for (const entry of ENTRIES) {
      const html = await (await fetch(`${origin}${entry.path}`)).text();
      const alternates = [
        ...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g),
      ].map(([, hreflang, href]) => ({ hreflang, href }));
      assert.deepEqual(
        alternates.map((a) => a.hreflang).sort(),
        ["en", "ja", "x-default", "zh-CN"],
        `${entry.path} 的 alternate 集合`,
      );
      // 从任一语言页出发都能到达同一工具的三种语言：跨会话/跨页面保持的前提
      for (const code of ["en", "zh-CN", "ja"]) {
        const target = alternates.find((a) => a.hreflang === code);
        assert.equal(
          target.href,
          `${SITE_URL}${seoPathFor(code, entry.route)}`,
          `${entry.path} 的 ${code} 互指`,
        );
      }
    }
  });

  it("互指目标全部可达（跟随 hreflang 不会 404）", async () => {
    const html = await (await fetch(`${origin}/zh/video-compress/`)).text();
    const hrefs = [
      ...html.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)"/g),
    ].map(([, href]) => href);
    for (const href of new Set(hrefs)) {
      const pathname = new URL(href).pathname;
      const response = await fetch(`${origin}${pathname}`, { redirect: "manual" });
      assert.equal(response.status, 200, `${pathname} 应可达`);
    }
  });

  it("同一工具在三种语言下的 URL 互不相同（语言进入 URL，可分享/可回访）", () => {
    for (const route of ["home", "video-compress", "image-a4-layout"]) {
      const paths = ["en", "zh-CN", "ja"].map((code) =>
        seoPathFor(code, route),
      );
      assert.equal(new Set(paths).size, 3, `${route} 的三种语言路径应互不相同`);
    }
  });

  it("语言偏好持久化所需的客户端脚本随入口页交付", async () => {
    // 「重新访问仍保持语言」依赖 LocaleProvider 在首帧前读本地存储。
    // 静态 HTML 里只有模块脚本入口，因此这里断言打包产物确实包含偏好键。
    const html = await (await fetch(`${origin}/`)).text();
    const src = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1];
    assert.ok(src, "入口页应有模块脚本");
    const bundle = await (await fetch(`${origin}${src}`)).text();
    assert.ok(
      bundle.includes("offline-tools-locale"),
      "打包产物应包含语言偏好键（跨会话保持依赖它）",
    );
  });
});

/**
 * 6.4 hydration 一致性 —— 实测结论与 design 决策 5 的假设不同。
 *
 * design 曾担心：入口页是构建期静态 HTML，其中的链接目标已写死，客户端若按
 * 「已保存偏好」渲染出不同 `href`，hydration 会报错。
 *
 * **实测：该风险不存在，因为站点是纯客户端渲染。** 入口 HTML 的 `<body>` 只有
 * `<div id="root"></div>` 与一个 `<noscript>` 区块，没有任何 React 渲染的标记；
 * React 首次挂载时并不存在「服务端渲染的链接」可供比对。因此 hydration 不会因
 * 语言化链接而不一致。
 *
 * 但**语言化的链接仍必须与当前语言一致**（否则点一下就会跨语言跳转），这条由
 * `toolHref(locale, …)` 单一入口保证，并在 6.3 的组件测试里逐语言断言。
 * 这里守住让该结论成立的结构性前提。
 */
describe("6.4 hydration 前提：入口页不含 React 渲染的标记", () => {
  it("21 个入口的 body 只有挂载点与 noscript，标记数不含任何应用外壳", async () => {
    for (const entry of ENTRIES) {
      const html = await (await fetch(`${origin}${entry.path}`)).text();
      // 应用外壳的类名不应出现在静态 HTML 里
      for (const marker of ["app-shell", "topbar", "language-switcher", "tool-nav"]) {
        assert.ok(
          !html.includes(marker),
          `${entry.path} 的静态 HTML 不应包含 ${marker}（否则才会有 hydration 比对）`,
        );
      }
      assert.match(html, /<div id="root"><\/div>/, `${entry.path} 应有挂载点`);
    }
  });

  it("静态 HTML 里的链接只在 noscript 内，且都指向本语言路径", async () => {
    for (const entry of ENTRIES) {
      const html = await (await fetch(`${origin}${entry.path}`)).text();
      const body = html.slice(html.indexOf("<body>"));
      const noscript = body.match(/<noscript>[\s\S]*?<\/noscript>/)?.[0] ?? "";
      // 去掉 noscript 后，body 里不应再有任何 <a>
      const outsideNoscript = body.replace(noscript, "");
      assert.ok(
        !/<a\s/.test(outsideNoscript),
        `${entry.path} 的 noscript 之外不应有链接（否则需要 hydration 比对）`,
      );
      // noscript 内的链接必须指向该语言
      const hrefs = [...noscript.matchAll(/href="([^"]+)"/g)].map(([, h]) => h);
      assert.ok(hrefs.length > 0, `${entry.path} 的 noscript 应有链接`);
      for (const href of hrefs) {
        const expectedPrefix = LOCALES[entry.locale].prefix;
        assert.ok(
          href.startsWith(`${expectedPrefix}/`),
          `${entry.path} 的 noscript 链接 ${href} 应带本语言前缀 "${expectedPrefix}"`,
        );
      }
    }
  });

  it("客户端模块脚本是应用标记的唯一来源", async () => {
    const html = await (await fetch(`${origin}/`)).text();
    // 静态 HTML 只有模块脚本入口，说明页面内容全部由客户端渲染
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(([, s]) => s);
    assert.deepEqual(scripts, ["/assets/main-" + scripts[0].split("main-")[1]]);
    assert.equal(scripts.length, 1, "入口页只应有一个模块脚本");
  });
});
