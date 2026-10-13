/**
 * 证件照页的视觉验收（任务 5.3 中未自动化的一项）。
 *
 * 窄屏垂直排列与明暗主题下的可读性属于视觉判断，无法用断言客观覆盖。
 * 本脚本产出一组截图供人工目视确认，并顺带做几条**可客观判定**的检查：
 * 窄屏不出现横向溢出、主要操作在视口内可点、明暗主题下背景与前景 token 生效。
 *
 * 用法：node scripts/e2e-id-photo-visual.mjs
 * 产物：/tmp/dsh-idphoto-shots/*.png
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { writeFile, readFile, stat, rm, mkdir } from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9411;
const PROFILE = "/tmp/dsh-idphoto-visual-profile";
const SHOTS = "/tmp/dsh-idphoto-shots";

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

const startServer = async () => {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
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

const launchChrome = async () => {
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(PROFILE, { recursive: true });
  const child = spawn(
    CHROME,
    [
      "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-crashpad",
      `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
      "--no-first-run", "--no-default-browser-check", "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  child.unref();
  for (let i = 0; i < 40; i += 1) {
    try {
      const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = t.find((x) => x.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* 未就绪 */ }
    await sleep(250);
  }
  throw new Error("Chrome CDP 未就绪");
};

const connect = async (wsUrl) => {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  };
  return { send, evaluate, close: () => ws.close() };
};

const MAKE_SAMPLE = `
(() => {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 900;
  const x = c.getContext('2d');
  x.fillStyle = '#c94f4f'; x.fillRect(0, 0, 600, 450);
  x.fillStyle = '#4f9d69'; x.fillRect(600, 0, 600, 450);
  x.fillStyle = '#4f6fc9'; x.fillRect(0, 450, 600, 450);
  x.fillStyle = '#d8c04a'; x.fillRect(600, 450, 600, 450);
  x.clearRect(0, 0, 150, 150);
  return c.toDataURL('image/png');
})()`;

const INJECT = (dataUrl) => `
(async () => {
  const input = document.querySelector('.id-photo-editor input[type=file]');
  if (!input) return false;
  const blob = await (await fetch(${JSON.stringify(dataUrl)})).blob();
  const file = new File([blob], 'visual-sample.png', { type: 'image/png' });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;

let passed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) { passed += 1; console.log(`  ok   ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const shoot = async (cdp, name) => {
  const r = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const file = path.join(SHOTS, `${name}.png`);
  await writeFile(file, Buffer.from(r.data, "base64"));
  console.log(`   截图: ${file}`);
};

const setViewport = async (cdp, width, height) => {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 600,
  });
  await sleep(400);
};

/**
 * 设置主题偏好。
 *
 * 必须在**已落到站点源**之后调用：about:blank 上访问 localStorage 会抛
 * SecurityError（不透明源）。
 */
const setTheme = async (cdp, theme) => {
  await cdp.evaluate(`localStorage.setItem('offline-tools-theme', ${JSON.stringify(theme)})`);
};

/** 先访问一次站点建立源，再设主题，再重新加载使主题生效。 */
const applyThemeAndLoad = async (cdp, origin, theme) => {
  await cdp.send("Page.navigate", { url: `${origin}/id-photo/` });
  await sleep(1500);
  await setTheme(cdp, theme);
  await cdp.send("Page.navigate", { url: `${origin}/id-photo/` });
  await sleep(2200);
};

const main = async () => {
  await rm(SHOTS, { recursive: true, force: true });
  await mkdir(SHOTS, { recursive: true });
  const { server, origin } = await startServer();
  const wsUrl = await launchChrome();
  const cdp = await connect(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setLocaleOverride", { locale: "en-US" });

  // ---------- 桌面 亮色 ----------
  console.log("桌面 1440×1400 · 亮色");
  await setViewport(cdp, 1440, 1400);
  await applyThemeAndLoad(cdp, origin, "light");
  const sample = await cdp.evaluate(MAKE_SAMPLE);
  await cdp.evaluate(INJECT(sample));
  await sleep(1800);
  const lightBg = await cdp.evaluate(
    `getComputedStyle(document.body).backgroundColor`,
  );
  check("亮色主题背景 token 生效（非纯黑）", !/rgb\(0, 0, 0\)/.test(lightBg), lightBg);
  await shoot(cdp, "01-desktop-light");

  // ---------- 桌面 暗色 ----------
  console.log("桌面 1440×1400 · 暗色");
  await applyThemeAndLoad(cdp, origin, "dark");
  const sample2 = await cdp.evaluate(MAKE_SAMPLE);
  await cdp.evaluate(INJECT(sample2));
  await sleep(1800);
  const darkBg = await cdp.evaluate(`getComputedStyle(document.body).backgroundColor`);
  check("暗色主题背景 token 生效", darkBg !== lightBg, `暗=${darkBg} 亮=${lightBg}`);
  await shoot(cdp, "02-desktop-dark");

  // ---------- 窄屏 390 暗色 ----------
  console.log("窄屏 390×844 · 暗色");
  await setViewport(cdp, 390, 844);
  await sleep(800);
  const overflow = await cdp.evaluate(
    `JSON.stringify({ doc: document.documentElement.scrollWidth, win: window.innerWidth })`,
  );
  const o = JSON.parse(overflow);
  check("窄屏无横向溢出（scrollWidth ≤ innerWidth + 1）", o.doc <= o.win + 1, JSON.stringify(o));
  await shoot(cdp, "03-narrow-dark");

  // ---------- 窄屏 390 亮色 ----------
  console.log("窄屏 390×844 · 亮色");
  await applyThemeAndLoad(cdp, origin, "light");
  const sample3 = await cdp.evaluate(MAKE_SAMPLE);
  await cdp.evaluate(INJECT(sample3));
  await sleep(1800);
  await setViewport(cdp, 390, 844);
  await sleep(600);
  await shoot(cdp, "04-narrow-light");

  // ---------- 主要操作在视口内可点 ----------
  console.log("窄屏可操作性");
  const reach = await cdp.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll('button')]
        .filter(b => b.offsetParent !== null)
        .find(b => b.textContent.includes('Process all'));
      if (!btn) return JSON.stringify({ found: false });
      btn.scrollIntoView({ block: 'center' });
      const r = btn.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return JSON.stringify({
        found: true, w: Math.round(r.width), h: Math.round(r.height),
        hitIsButton: hit === btn || btn.contains(hit),
      });
    })()`);
  const R = JSON.parse(reach);
  check("窄屏下「处理全部」存在且有尺寸", R.found && R.w > 0 && R.h > 0, reach);
  check("窄屏下「处理全部」可被点中（未被遮挡）", R.hitIsButton === true, reach);

  console.log(`\n通过 ${passed}，失败 ${failures.length}`);
  if (failures.length) for (const f of failures) console.log("  -", f);
  console.log(`\n截图目录: ${SHOTS}（请人工目视确认布局与可读性）`);

  cdp.close();
  server.close();
  process.exit(failures.length ? 1 : 0);
};

main().catch((e) => { console.error("运行失败:", e); process.exit(2); });
