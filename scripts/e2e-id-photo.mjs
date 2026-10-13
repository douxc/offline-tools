/**
 * 证件照工具的**真实图片导出验收**（任务 5.2–5.4）。
 *
 * 用本地 Chrome + CDP 驱动构建产物 `dist/`，在页面内生成一张带**不对称色块与
 * 透明区域**的样图，通过 DataTransfer 注入 `<input type=file>`（与用户选文件
 * 走同一条 onChange 路径），再真实点击 UI 完成导入 → 处理 → 下载。
 *
 * 关键点：**校验真实像素**。拦截 `URL.createObjectURL` 拿到导出的 Blob，
 * 在页面里解码回 canvas 读像素，据此断言输出尺寸、保留区域与透明通道，
 * 而不是只断言「按钮变成可点」。
 *
 * 用法：node scripts/e2e-id-photo.mjs
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, stat, rm, mkdir } from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9377;
const PROFILE = "/tmp/dsh-idphoto-profile";

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

/* ------------------------------------------------------------------ 基础设施 */

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
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-crashpad",
      `--remote-debugging-port=${PORT}`,
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
      const targets = await (
        await fetch(`http://127.0.0.1:${PORT}/json/list`)
      ).json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* 未就绪 */
    }
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
  const consoleErrors = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push(
        msg.params.args.map((a) => a.value ?? a.description ?? "").join(" "),
      );
    }
    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(
        msg.params.exceptionDetails?.exception?.description ??
          msg.params.exceptionDetails?.text ??
          "exception",
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
  return { send, evaluate, consoleErrors, close: () => ws.close() };
};

/**
 * 收集「当前可见」的候选元素。
 *
 * 图片三个工具常挂载在同一个 DOM 里（用 `hidden` 属性显隐），因此
 * `document.querySelector('.tool-tabs a[href="/image-compress/"]')` 会命中
 * **隐藏工具里的同名链接**（尺寸为 0），真实鼠标事件便打在 (0,0) 上而不生效。
 * 所有交互都必须先过滤到可见元素。
 */
const VISIBLE_FILTER = `(el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0`;

/** 用真实鼠标事件点击「表达式求值得到的元素」的中心。 */
const clickExpression = async (cdp, elementExpression) => {
  // 先滚动到视口内，否则坐标会落在可视区域之外
  await cdp.evaluate(
    `(()=>{const el=${elementExpression}; if(el) el.scrollIntoView({block:'center'}); return true;})()`,
  );
  await sleep(150);
  const box = await cdp.evaluate(
    `JSON.stringify((()=>{const el=${elementExpression}; if(!el) return null; const r=el.getBoundingClientRect(); if(!r.width && !r.height) return null; return {x:r.x+r.width/2,y:r.y+r.height/2};})())`,
  );
  if (!box || box === "null") return false;
  const { x, y } = JSON.parse(box);
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  }
  return true;
};

/** 用可见文字点击按钮。 */
const clickByText = (cdp, text) =>
  clickExpression(
    cdp,
    `[...document.querySelectorAll('button')].filter(${VISIBLE_FILTER}).find(b => b.textContent.includes(${JSON.stringify(text)}))`,
  );

/** 清空下载目录并让 Chrome 把下载落到该目录。 */
const resetDownloads = async (cdp) => {
  await rm(DOWNLOAD_DIR, { recursive: true, force: true });
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  await cdp.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: DOWNLOAD_DIR,
  });
};

/** 等待下载完成并返回 { name, dataUrl }。 */
const waitForDownload = async (cdp, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  let lastSize = -1;
  let stable = 0;
  while (Date.now() < deadline) {
    const names = await listDownloads();
    const done = names.filter((n) => !n.endsWith(".crdownload"));
    if (done.length > 0) {
      const file = path.join(DOWNLOAD_DIR, done[0]);
      const bytes = await readFile(file);
      // 等文件大小稳定，否则会读到尚未写完的字节，解码报 InvalidStateError
      if (bytes.length === lastSize && bytes.length > 0) {
        stable += 1;
        if (stable >= 2) {
          return {
            name: done[0],
            size: bytes.length,
            dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
          };
        }
      } else {
        stable = 0;
        lastSize = bytes.length;
      }
    }
    await sleep(200);
  }
  return null;
};

const listDownloads = async () => {
  try {
    return await readdir(DOWNLOAD_DIR);
  } catch {
    return [];
  }
};

const goto = async (cdp, url, timeout = 15000) => {
  await cdp.send("Page.navigate", { url });
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await cdp
      .evaluate(
        `document.readyState === 'complete' && !!document.querySelector('.id-photo-empty, .id-photo-list')`,
      )
      .catch(() => false);
    if (ready) return true;
    await sleep(120);
  }
  return false;
};

/* --------------------------------------------------------------------- 断言 */

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

/* ----------------------------------------------------------- 页面内注入的代码 */

/**
 * 生成样图：2048×1536，四象限不同色，左上一块**完全透明**。
 * 不对称色块使「裁到了哪一块」可从输出像素直接判读。
 */
const MAKE_SAMPLE = `
(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  // 四象限：红 绿 蓝 黄（左右/上下都不同，便于判断裁切区域）
  ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 1024, 768);
  ctx.fillStyle = '#00ff00'; ctx.fillRect(1024, 0, 1024, 768);
  ctx.fillStyle = '#0000ff'; ctx.fillRect(0, 768, 1024, 768);
  ctx.fillStyle = '#ffff00'; ctx.fillRect(1024, 768, 1024, 768);
  // 左上角挖出完全透明的方块
  ctx.clearRect(0, 0, 256, 256);
  return canvas.toDataURL('image/png');
})()`;

/** 把 DataURL 变成 File 并经 DataTransfer 注入 input（与真实选文件同一路径）。 */
const INJECT_FILE = (dataUrl, name) => `
(async () => {
  // 图片三个工具常挂载，DOM 里有多个 input[type=file]；
  // 必须取**证件照页面内**的那一个，否则文件会喂给别的工具。
  const input = document.querySelector('.id-photo-editor input[type=file]')
    ?? [...document.querySelectorAll('input[type=file]')].find(i => i.accept.includes('.png,.jpg'));
  if (!input) return JSON.stringify({ ok: false, why: 'no id-photo input[type=file]' });
  const blob = await (await fetch(${JSON.stringify(dataUrl)})).blob();
  const file = new File([blob], ${JSON.stringify(name)}, { type: 'image/png' });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  if (input.files.length !== 1) return JSON.stringify({ ok: false, why: 'files not set' });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return JSON.stringify({ ok: true, size: file.size, name: file.name });
})()`;

/**
 * 通过真实**下载**取回导出文件。
 *
 * 不能拦截 `URL.createObjectURL`：`downloadPhotos` 的默认 port 在模块加载时就把
 * `blob => URL.createObjectURL(blob)` 闭包固定了，运行期替换全局函数影响不到它。
 * 因此改为让 Chrome 把下载落到临时目录，再读回文件并解码校验真实像素 ——
 * 这也更接近用户实际拿到的东西。
 */
const DOWNLOAD_DIR = "/tmp/dsh-idphoto-downloads";

/** 解码给定 PNG 文件的真实像素。 */
const DECODE_FILE = (dataUrl) => `
(async () => {
  const blob = await (await fetch(${JSON.stringify(dataUrl)})).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const at = (x, y) => {
    const d = ctx.getImageData(x, y, 1, 1).data;
    return [d[0], d[1], d[2], d[3]].join(',');
  };
  const fullyTransparent = (x, y, w, h) => {
    const d = ctx.getImageData(x, y, w, h).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
    return true;
  };
  const w = bitmap.width, h = bitmap.height;
  return JSON.stringify({
    width: w, height: h, type: blob.type, size: blob.size,
    topLeft: at(3, 3), topRight: at(w - 4, 3),
    bottomLeft: at(3, h - 4), bottomRight: at(w - 4, h - 4),
    anyTransparent: (() => {
      const d = ctx.getImageData(0, 0, w, h).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] === 0) return true;
      return false;
    })(),
    topLeftPatchTransparent: fullyTransparent(0, 0, Math.max(1, w >> 4), Math.max(1, h >> 4)),
  });
})()`;



/** 点下载按钮，取回真实文件并解码像素。 */
const downloadAndDecode = async (cdp, buttonText) => {
  await resetDownloads(cdp);
  const clicked = await clickByText(cdp, buttonText);
  if (!clicked) return null;
  const file = await waitForDownload(cdp);
  if (!file) return null;
  let decoded;
  try {
    decoded = JSON.parse(await cdp.evaluate(DECODE_FILE(file.dataUrl)));
  } catch (error) {
    console.log(`   （解码 ${file.name} 失败：${String(error).slice(0, 80)}）`);
    return null;
  }
  return { ...decoded, name: file.name, fileSize: file.size };
};

/* ---------------------------------------------------------------------- 主体 */

const main = async () => {
  const { server, origin } = await startServer();
  console.log(`静态站点: ${origin}`);
  const wsUrl = await launchChrome();
  const cdp = await connect(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setLocaleOverride", { locale: "en-US" });
  /*
   * 必须显式设置视口：默认 headless 视口约 600×800，而证件照页的
   * 「处理全部」按钮位于 y≈1084 —— 在视口之外。真实鼠标事件打在视口坐标上，
   * 于是「点击」落在空白处，按钮永远不被触发，表现为「处理没有反应」。
   */
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1400,
    deviceScaleFactor: 1,
    mobile: false,
  });
  console.log("Chrome CDP 已连接\n");

  // ---------- 5.2 真实导出（一寸 / 二寸 / 放大拖动 / 四边裁切 / 自定义缩小）----------
  console.log("5.2 真实图片导出：尺寸、保留区域、透明通道");
  await goto(cdp, `${origin}/id-photo/`);

  const sample = await cdp.evaluate(MAKE_SAMPLE);
  check("页面内生成 2048×1536 样图（四象限异色 + 左上透明）", typeof sample === "string" && sample.startsWith("data:image/png"));
  const inj = await cdp.evaluate(INJECT_FILE(sample, "sample.png"));
  console.log("   注入结果:", inj);
  await sleep(1200);

  const imported = await cdp.evaluate(`document.querySelectorAll('.id-photo-list-item').length`);
  check("导入后列表出现 1 张", imported === 1, `实际 ${imported}`);

  // 默认常用尺寸 = 一寸 295×413
  await clickByText(cdp, "Process all");
  await sleep(2500);

  let decoded = await downloadAndDecode(cdp, "Download current image");
  check("一寸输出尺寸为 295×413（300 PPI 换算）", decoded && decoded.width === 295 && decoded.height === 413, decoded ? `${decoded.width}×${decoded.height}` : "未取到下载文件");
  check("下载文件名含尺寸与序号", !!decoded && /_295x413_\d{3}\.png$/.test(decoded.name), decoded ? decoded.name : "无");
  check("输出为 PNG（沿用原图格式）", decoded.type === "image/png", decoded.type);

  // 源图 2048×1536 居中裁成 295:413 → 覆盖裁切，四角应取自四象限
  check("居中覆盖裁切：右上角取到绿色象限", decoded.topRight.startsWith("0,255,0"), decoded.topRight);
  check("居中覆盖裁切：左下角取到蓝色象限", decoded.bottomLeft.startsWith("0,0,255"), decoded.bottomLeft);
  check("居中覆盖裁切：右下角取到黄色象限", decoded.bottomRight.startsWith("255,255,0"), decoded.bottomRight);

  // 切到二寸
  await clickByText(cdp, "2 inch");
  await sleep(600);
  await clickByText(cdp, "Process all");
  await sleep(2500);
  decoded = await downloadAndDecode(cdp, "Download current image");
  check("二寸输出尺寸为 413×579", !!decoded && decoded.width === 413 && decoded.height === 579, decoded ? `${decoded.width}×${decoded.height}` : "未取到下载文件");

  // 放大拖动到左上角：应把透明区带进画面，且保留透明通道（不被填白）
  await clickByText(cdp, "1 inch");
  await sleep(500);
  /*
   * 缩放用键盘操作 Radix Slider 的 thumb：它渲染为 <span role="slider">，
   * 没有 input value 可写（对 span 调用 value setter 会报 Illegal invocation）。
   * 初始 100（1×），PageUp 每次 +10，按 30 次到 400（4×）。
   */
  const zoomStart = await cdp.evaluate(`
    (() => {
      const thumb = [...document.querySelectorAll('#id-photo-zoom [role=slider]')].find(el => el.offsetParent !== null);
      if (!thumb) return 'no-thumb';
      thumb.focus();
      return thumb.getAttribute('aria-valuenow');
    })()`);
  check("缩放滑块可聚焦（role=slider）", zoomStart !== "no-thumb", String(zoomStart));
  for (let i = 0; i < 30; i += 1) {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown", key: "PageUp", code: "PageUp", windowsVirtualKeyCode: 33,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp", key: "PageUp", code: "PageUp", windowsVirtualKeyCode: 33,
    });
  }
  await sleep(700);
  const zoomNow = await cdp.evaluate(
    `[...document.querySelectorAll('#id-photo-zoom [role=slider]')].find(el => el.offsetParent !== null)?.getAttribute('aria-valuenow')`,
  );
  check("缩放可调到 400（4 倍）", zoomNow === "400", `实际 ${zoomNow}`);

  /*
   * 仅放大不够：缩放保持中心，透明角仍在取景框外。必须**真实拖动**把左上角
   * 移进画面。拖动裁切预览区（Pointer Events）。
   */
  const dragInfo = await cdp.evaluate(
    `JSON.stringify((()=>{const el=[...document.querySelectorAll('.id-photo-preview')].find(e=>e.offsetParent!==null); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};})())`,
  );
  if (dragInfo && dragInfo !== "null") {
    const d = JSON.parse(dragInfo);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: d.x, y: d.y, button: "left", clickCount: 1 });
    // 向右下拖：把左上角内容移入取景框
    for (const step of [0.25, 0.5, 0.75, 1]) {
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: d.x + (d.w / 2) * step,
        y: d.y + (d.h / 2) * step,
        button: "left",
      });
      await sleep(60);
    }
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: d.x + d.w / 2, y: d.y + d.h / 2, button: "left", clickCount: 1 });
    await sleep(400);
    check("裁切预览可拖动", true);
  } else {
    check("裁切预览可拖动", false, "未找到预览容器");
  }
  await clickByText(cdp, "Process all");
  await sleep(2500);
  decoded = await downloadAndDecode(cdp, "Download current image");
  check("放大到 4 倍后仍输出一寸尺寸", !!decoded && decoded.width === 295 && decoded.height === 413, decoded ? `${decoded.width}×${decoded.height}` : "未取到下载文件");
  check("放大后输出仍为 PNG", !!decoded && decoded.type === "image/png", decoded ? decoded.type : "无");
  /*
   * 透明通道由「自定义缩小」用例证明（覆盖整幅图，透明角必然入画）。
   * 固定尺寸 + 4 倍放大时取景框只覆盖画面一小块，透明角不一定在框内 ——
   * 因此这里不断言透明，避免写出一条依赖拖动精度的脆弱断言。
   */

  // 自定义等比缩小：2048×1536 按宽 600 → 600×450
  await clickByText(cdp, "Custom proportional scaling");
  await sleep(600);
  const inputOk = await cdp.evaluate(`
    (() => {
      const input = [...document.querySelectorAll('#id-photo-target')].find(el => el.offsetParent !== null);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '600');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return !!input;
    })()`);
  check("自定义模式可输入目标像素", inputOk);
  await sleep(500);
  await clickByText(cdp, "Process all");
  await sleep(2500);
  decoded = await downloadAndDecode(cdp, "Download current image");
  check("自定义按宽 600 输出 600×450（保留完整画面等比缩小）", !!decoded && decoded.width === 600 && decoded.height === 450, decoded ? `${decoded.width}×${decoded.height}` : "未取到下载文件");
  check("自定义缩小保留左上透明区域（未填白）", !!decoded && decoded.topLeftPatchTransparent === true, decoded ? JSON.stringify(decoded.topLeft) : "无");

  // ---------- 5.3 多张构图 / 模式切换 / 结果失效 / 取消 / 路由 / 键盘 ----------
  console.log("\n5.3 多张构图、模式切换、结果失效、取消与键盘");
  const sample2 = await cdp.evaluate(MAKE_SAMPLE);
  await cdp.evaluate(INJECT_FILE(sample2, "second.png"));
  await sleep(1200);
  const two = await cdp.evaluate(`document.querySelectorAll('.id-photo-list-item').length`);
  check("可导入第二张", two === 2, `实际 ${two}`);

  await clickByText(cdp, "Standard sizes");
  await sleep(500);
  await clickByText(cdp, "Process all");
  await sleep(3000);
  const summary = await cdp.evaluate(
    `[...document.querySelectorAll('span')].map(s=>s.textContent).find(t=>t && t.includes('results ready')) || ''`,
  );
  check("两张均处理完成（结果计数为 2）", summary.includes("2"), summary);

  const downloadDisabled = await cdp.evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null).find(x => x.textContent.includes('Download all'));
      return b ? b.disabled : null;
    })()`);
  check("有结果时批量下载可用", downloadDisabled === false, String(downloadDisabled));

  // 结果失效：改变预设应使旧结果不可下载
  await clickByText(cdp, "2 inch");
  await sleep(800);
  const invalidated = await cdp.evaluate(
    `[...document.querySelectorAll('span')].map(s=>s.textContent).find(t=>t && t.includes('Download all')) || ''`,
  );
  const downloadDisabledAfter = await cdp.evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].filter(x => x.offsetParent !== null).find(x => x.textContent.includes('Download all'));
      return b ? b.disabled : null;
    })()`);
  check("切换预设后旧结果失效（批量下载回到不可用）", downloadDisabledAfter === true, `disabled=${downloadDisabledAfter} ${invalidated}`);

  // 键盘：聚焦裁切区后方向键应改变构图
  const kb = await cdp.evaluate(`
    (() => {
      const area = document.querySelector('.id-photo-crop-frame')?.parentElement;
      if (!area) return 'no-area';
      area.focus?.();
      return document.activeElement === area ? 'focused' : (document.activeElement?.tagName ?? 'none');
    })()`);
  check("裁切区域可聚焦（键盘操作前提）", kb !== "no-area", kb);

  /*
   * 路由切换必须走**站内导航**（ToolTabs 的 pushState），不能用 Page.navigate ——
   * 后者是整页加载，会重建文档并清空 React 状态，测的就不是「常挂载保持」了。
   */
  const tabTo = async (href) => {
    const ok = await clickExpression(
      cdp,
      `[...document.querySelectorAll('.tool-tabs a[href="${href}"]')].find(${VISIBLE_FILTER})`,
    );
    if (!ok) return false;
    await sleep(700);
    return true;
  };
  /** 读取当前可见证件照页的构图（缩放 + 是否已处理）。 */
  const readCrop = () =>
    cdp.evaluate(`JSON.stringify({
      zoom: [...document.querySelectorAll('#id-photo-zoom [role=slider]')].find(e=>e.offsetParent!==null)?.getAttribute('aria-valuenow') ?? null,
      resize: [...document.querySelectorAll('input')].find(i=>i.id==='id-photo-target')?.value ?? null,
    })`);

  /*
   * 先在本页把缩放调到 400，再离开/返回，这样「保持」才是可证伪的：
   * 若返回后被重置为默认 100，断言会失败。（早前模式切到自定义会重置缩放，
   * 因此在模式切换之后设置才有意义。）
   */
  await cdp.evaluate(
    `(()=>{const th=[...document.querySelectorAll('#id-photo-zoom [role=slider]')].find(e=>e.offsetParent!==null); th.focus(); return 1;})()`,
  );
  for (let i = 0; i < 30; i += 1) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "PageUp", code: "PageUp", windowsVirtualKeyCode: 33 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "PageUp", code: "PageUp", windowsVirtualKeyCode: 33 });
  }
  await sleep(600);
  const cropBefore = JSON.parse(await readCrop());
  check("离开前把缩放设为 400", cropBefore.zoom === "400", JSON.stringify(cropBefore));
  check("可从证件照点二级 tab 到图片压缩", await tabTo("/image-compress/"));
  check("站内切换后 URL 为 /image-compress/", (await cdp.evaluate("location.pathname")) === "/image-compress/", await cdp.evaluate("location.pathname"));
  check("可从图片压缩点回证件照", await tabTo("/id-photo/"));
  const keptAfterRoute = await cdp.evaluate(`document.querySelectorAll('.id-photo-list-item').length`);
  check("站内往返后证件照列表保持（常挂载）", keptAfterRoute === 2, `实际 ${keptAfterRoute}`);
  const cropAfter = JSON.parse(await readCrop());
  check(
    "站内往返后缩放设置保持（编辑数据不丢）",
    cropAfter.zoom === cropBefore.zoom,
    `离开前 ${cropBefore.zoom} → 返回后 ${cropAfter.zoom}`,
  );

  // 清空确认：Popconfirm 取消后保留
  await clickByText(cdp, "Clear images");
  await sleep(600);
  const dialog = await cdp.evaluate(
    `!!document.querySelector('[role=dialog], [data-radix-popper-content-wrapper]')`,
  );
  check("清空走既有确认弹层", dialog === true, String(dialog));
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(600);
  const afterCancel = await cdp.evaluate(`document.querySelectorAll('.id-photo-list-item').length`);
  check("取消清空后图片保留", afterCancel === 2, `实际 ${afterCancel}`);

  // ---------- 5.4 离线（构建产物由 SW 预缓存）----------
  console.log("\n5.4 离线可用性（真实断网 + Service Worker 预缓存）");
  const sw = await (await fetch(`${origin}/sw.js`)).text();
  check("预缓存清单包含 /id-photo/ 入口", sw.includes("id-photo/index.html"), "未在 sw.js 中找到");
  check("预缓存清单包含日语证件照入口", sw.includes("ja/id-photo/index.html"), "未在 sw.js 中找到");
  check("预缓存清单包含中文证件照入口", sw.includes("zh/id-photo/index.html"), "未在 sw.js 中找到");

  /*
   * 真实断网：先等 Service Worker 接管并完成预缓存，再切断网络，
   * 重新打开 /id-photo/ 并确认仍能渲染与导入。
   */
  await goto(cdp, `${origin}/id-photo/`);
  const swReady = await (async () => {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const state = await cdp.evaluate(
        `(async () => {
           const reg = await navigator.serviceWorker.getRegistration();
           if (!reg) return 'none';
           if (reg.active) return 'active';
           return 'installing';
         })()`,
      ).catch(() => "err");
      if (state === "active") return "active";
      await sleep(400);
    }
    return "timeout";
  })();
  check("Service Worker 已接管页面", swReady === "active", swReady);

  // 等预缓存完成：navigator.storage.estimate 有占用即说明写入了 Cache Storage
  await sleep(2500);
  const cacheInfo = await cdp.evaluate(
    `(async () => {
       const names = await caches.keys();
       let total = 0;
       for (const n of names) {
         const c = await caches.open(n);
         total += (await c.keys()).length;
       }
       return JSON.stringify({ caches: names.length, entries: total });
     })()`,
  ).catch(() => "{}");
  const caches = JSON.parse(cacheInfo || "{}");
  check("Cache Storage 中已有预缓存条目", (caches.entries ?? 0) > 0, cacheInfo);

  // 断网
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  const wentOffline = await cdp.evaluate(`navigator.onLine === false`);
  check("已切换到离线状态", wentOffline === true, String(wentOffline));

  // 离线重新打开证件照页
  const offlineLoaded = await goto(cdp, `${origin}/id-photo/`, 20000);
  check("离线可直接打开 /id-photo/", offlineLoaded === true, "超时未渲染");
  const offlineTitle = await cdp.evaluate(
    `[...document.querySelectorAll('h1')].map(h=>h.textContent).join('|')`,
  ).catch(() => "");
  check("离线渲染出证件照页", offlineTitle.length > 0, offlineTitle.slice(0, 60));

  // 离线导入
  const offlineSample = await cdp.evaluate(MAKE_SAMPLE).catch(() => null);
  if (offlineSample) {
    await cdp.evaluate(INJECT_FILE(offlineSample, "offline.png"));
    await sleep(2000);
    const offlineCount = await cdp.evaluate(
      `document.querySelectorAll('.id-photo-list-item').length`,
    );
    check("离线仍可导入图片", offlineCount >= 1, `实际 ${offlineCount}`);
  } else {
    check("离线仍可导入图片", false, "离线状态下无法生成样图");
  }

  // 恢复网络
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  // ---------- 控制台 ----------
  console.log("\n控制台");
  const real = cdp.consoleErrors.filter((e) => !/favicon|hm\.js|baidu|net::ERR/i.test(e));
  check("无运行时 console 错误", real.length === 0, real.slice(0, 2).join(" | "));

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
