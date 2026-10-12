/**
 * 真实浏览器端到端验收（本地 Chrome + CDP，无额外依赖）。
 *
 * 为什么需要它：此前的 E2E 只覆盖「HTTP 返回什么」，无法驱动 Radix Select 的
 * Portal 弹层 —— 「展开语言切换器 → 选中另一语言 → 到达目标语言页面」这条路径
 * 只在真实浏览器里成立。本脚本用 Node 内置 WebSocket 直连 Chrome DevTools
 * Protocol，不引入 Playwright/Puppeteer。
 *
 * 覆盖：
 *   A. 21 条 URL 在真实浏览器里渲染出正确语言（`document.documentElement.lang`
 *      与标题由 JS 执行后读取，比抓 HTML 更接近用户所见）
 *   B. 语言切换器：展开 → 列出三种语言 → 选中 → 整页导航 → 到达目标语言且仍是同一工具
 *   C. 跨会话保持：切换后重开同一路径，偏好生效
 *   D. 页面无 console 错误
 *
 * 用法：node scripts/e2e-browser.mjs [--keep-open]
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat, rm, mkdir } from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = 9333;
const PROFILE = "/tmp/dsh-e2e-profile";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- 静态站点 */

const startStaticServer = async () => {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let file = path.join(DIST, path.normalize(decodeURIComponent(url.pathname)));
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    } catch {
      res.writeHead(404).end("not found");
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
};

/* ------------------------------------------------------------------- Chrome */

const launchChrome = async () => {
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(PROFILE, { recursive: true });
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      // DSH 沙箱下 Chrome 自带沙箱无法初始化
      "--no-sandbox",
      "--disable-gpu",
      "--disable-crashpad",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  child.unref();
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* 还没起来 */
    }
    await sleep(250);
  }
  throw new Error("Chrome CDP 未在预期时间内就绪");
};

/* ---------------------------------------------------------------- CDP 客户端 */

const connect = async (wsUrl) => {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const consoleErrors = [];
  const events = [];

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    events.push(msg);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push(
        msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "),
      );
    }
    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(
        msg.params.exceptionDetails?.exception?.description ??
          msg.params.exceptionDetails?.text ??
          "unknown exception",
      );
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        `求值失败: ${result.exceptionDetails.exception?.description ?? ""}`,
      );
    }
    return result.result.value;
  };

  return { send, evaluate, consoleErrors, events, close: () => ws.close() };
};

/**
 * 用 CDP 派发**真实鼠标事件**点击元素中心。
 *
 * Radix 的 Select 不响应脚本合成的 `.click()`（探针实测：合成点击后路径与偏好
 * 都不变，真实鼠标事件才触发导航）。因此这里必须走 Input.dispatchMouseEvent。
 */
const clickElement = async (cdp, expression) => {
  const box = await cdp.evaluate(
    `JSON.stringify((()=>{const el=${expression}; if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})())`,
  );
  if (!box || box === "null") return false;
  const { x, y } = JSON.parse(box);
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  }
  return true;
};

const clearLocalePreference = (cdp) =>
  cdp.evaluate(`localStorage.removeItem('offline-tools-locale')`);

/** 导航并等待应用挂载完成（语言切换器出现即视为已渲染）。 */
const gotoAndSettle = async (cdp, url, timeoutMs = 15000) => {
  await cdp.send("Page.navigate", { url });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await cdp
      .evaluate(
        `!!document.querySelector('.language-switcher') && document.readyState === 'complete'`,
      )
      .catch(() => false);
    if (ready) return true;
    await sleep(120);
  }
  return false;
};

/* ------------------------------------------------------------------- 断言 */

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const ENTRIES = [];
for (const [loc, prefix] of [
  ["en", ""],
  ["zh-CN", "/zh"],
  ["ja", "/ja"],
]) {
  for (const route of [
    "",
    "video-frame/",
    "video-compress/",
    "image-compress/",
    "image-watermark/",
    "id-photo/",
    "image-a4-layout/",
  ]) {
    ENTRIES.push({ loc, path: `${prefix}/${route}`.replace("//", "/") });
  }
}

/* --------------------------------------------------------------------- 主体 */

const main = async () => {
  const { server, origin } = await startStaticServer();
  console.log(`静态站点: ${origin}`);
  const wsUrl = await launchChrome();
  console.log(`Chrome CDP: 已连接\n`);

  const cdp = await connect(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  /*
   * 固定 navigator.language 为英语。
   *
   * 解析链第 3 级是 navigator.language，本机系统语言为 zh-CN，因此不覆写的话
   * 「无偏好时默认英语」这条断言会失败 —— 那是**测试环境**差异，不是站点缺陷。
   * macOS 的 Chrome 忽略 `--lang`，必须用 CDP 的 setLocaleOverride。
   */
  await cdp.send("Emulation.setLocaleOverride", { locale: "en-US" });
  await cdp.send("Emulation.setUserAgentOverride", {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
    acceptLanguage: "en-US,en",
  });

  console.log("A. 21 条 URL 在真实浏览器中的渲染语言");
  // 先清空偏好，使「无前缀路径」走默认语言（英语）分支；
  // 否则解析链会落到 navigator.language（本机为 zh-CN）
  await gotoAndSettle(cdp, `${origin}/`);
  await clearLocalePreference(cdp);
  for (const entry of ENTRIES) {
    const ok = await gotoAndSettle(cdp, `${origin}${entry.path}`);
    if (!ok) {
      check(`${entry.path} 渲染完成`, false, "超时");
      continue;
    }
    const info = await cdp.evaluate(
      `JSON.stringify({ lang: document.documentElement.lang, title: document.title, url: location.pathname })`,
    );
    const parsed = JSON.parse(info);
    const expectedLang = { en: "en", "zh-CN": "zh-CN", ja: "ja" }[entry.loc];
    check(
      `${entry.path} lang=${expectedLang}`,
      parsed.lang === expectedLang,
      `实际 ${parsed.lang}`,
    );
    check(
      `${entry.path} 未发生重定向`,
      parsed.url === entry.path,
      `实际 ${parsed.url}`,
    );
  }

  console.log("\nB. 语言切换器（真实交互：展开 → 选中 → 导航）");
  // 从英语视频压缩页出发
  await gotoAndSettle(cdp, `${origin}/video-compress/`);
  await clearLocalePreference(cdp);
  await gotoAndSettle(cdp, `${origin}/video-compress/`);
  await clickElement(cdp, `document.querySelector('.language-switcher')`);
  await sleep(500);
  const options = await cdp.evaluate(
    `JSON.stringify([...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim()))`,
  );
  const opts = JSON.parse(options);
  check("展开后列出三种语言", opts.length === 3, `实际 ${JSON.stringify(opts)}`);
  check(
    "选项为英语/简体中文/日语",
    ["English", "简体中文", "日本語"].every((n) => opts.includes(n)),
    JSON.stringify(opts),
  );

  // 选中「日本語」——必须用真实鼠标事件
  const jaClicked = await clickElement(
    cdp,
    `[...document.querySelectorAll('[role="option"]')].find(o => o.textContent.trim() === '日本語')`,
  );
  check("可点击「日本語」选项", jaClicked);
  const switched = await (async () => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const p = await cdp.evaluate(`location.pathname`).catch(() => "");
      if (p === "/ja/video-compress/") return true;
      await sleep(150);
    }
    return false;
  })();
  check("切到日语后到达 /ja/video-compress/（保持当前工具）", switched,
    `实际 ${await cdp.evaluate(`location.pathname`)}`);
  await gotoAndSettle(cdp, `${origin}/ja/video-compress/`).catch(() => {});
  const jaLang = await cdp.evaluate(`document.documentElement.lang`);
  check("日语页面 lang=ja", jaLang === "ja", String(jaLang));

  // 再切回英语
  await clickElement(cdp, `document.querySelector('.language-switcher')`);
  await sleep(500);
  await clickElement(
    cdp,
    `[...document.querySelectorAll('[role="option"]')].find(o => o.textContent.trim() === 'English')`,
  );
  const backToEn = await (async () => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const p = await cdp.evaluate(`location.pathname`).catch(() => "");
      if (p === "/video-compress/") return true;
      await sleep(150);
    }
    return false;
  })();
  check("切回英语回到 /video-compress/（无 /en 前缀）", backToEn,
    `实际 ${await cdp.evaluate(`location.pathname`)}`);

  console.log("\nC. 跨会话保持（偏好写入本地存储并在重开时生效）");
  const stored = await cdp.evaluate(
    `localStorage.getItem('offline-tools-locale')`,
  );
  check("切换后偏好已写入", stored === "en", `实际 ${stored}`);

  // 切到中文，然后直接打开 /（无前缀）验证偏好生效
  await gotoAndSettle(cdp, `${origin}/zh/id-photo/`);
  const zhStored = await cdp.evaluate(
    `localStorage.getItem('offline-tools-locale')`,
  );
  check("显式语言路径会更新偏好", zhStored === "zh-CN", `实际 ${zhStored}`);
  const reopened = await gotoAndSettle(cdp, `${origin}/`);
  const langAfterReopen = reopened
    ? await cdp.evaluate(`document.documentElement.lang`)
    : "n/a";
  check(
    "重开无前缀 / 时沿用已保存偏好（zh-CN）",
    langAfterReopen === "zh-CN",
    `实际 ${langAfterReopen}`,
  );

  console.log("\nD. 控制台错误");
  const realErrors = cdp.consoleErrors.filter(
    (e) => !/favicon|hm\.js|baidu|net::ERR/i.test(e),
  );
  check("无 React/运行时 console 错误", realErrors.length === 0,
    realErrors.slice(0, 2).join(" | "));

  console.log(`\n通过 ${passed}，失败 ${failures.length}`);
  if (failures.length) {
    console.log("\n失败项：");
    for (const f of failures) console.log("  -", f);
  }

  cdp.close();
  server.close();
  process.exit(failures.length ? 1 : 0);
};

main().catch((error) => {
  console.error("E2E 运行失败:", error);
  process.exit(2);
});
