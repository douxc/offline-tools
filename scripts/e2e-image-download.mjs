import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";

// Run after pnpm build. Uses an isolated Chrome profile and real downloaded files.
const root = await mkdtemp(path.join(tmpdir(), "offline-image-download-"));
const dist = path.resolve(import.meta.dirname, "../dist");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    let file = path.join(dist, new URL(req.url, "http://localhost").pathname);
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    res.setHeader("Content-Type", types[path.extname(file)] ?? "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
let chrome;
let socket;

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${root}/profile`,
    "--no-first-run", "--no-default-browser-check", "about:blank",
  ], { stdio: "ignore" });
  let chromeError;
  chrome.on("error", error => { chromeError = error; });
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (chromeError) throw chromeError;
    try { port = (await readFile(`${root}/profile/DevToolsActivePort`, "utf8")).split("\n")[0]; break; }
    catch { await sleep(100); }
  }
  assert.ok(port, "Chrome must start");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (!pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    clearTimeout(timer);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression).catch(() => false)) return;
      await sleep(100);
    }
    assert.fail(`Timed out: ${expression}`);
  };
  const click = async selector => {
    const point = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el || el.disabled) return null;
      el.scrollIntoView({block: 'center'});
      const r = el.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2};
    })()`);
    assert.ok(point, `Enabled button: ${selector}`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
    }
  };
  await send("Page.enable");
  for (const [route, count] of [["image-compress", 6], ["image-compress", 3], ["image-compress", 4], ["image-watermark", 6]]) {
    await send("Page.navigate", { url: `${origin}/${route}/` });
    await waitFor("document.readyState === 'complete' && !!document.querySelector('.image-app input[type=file]')");
    await evaluate(`(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600;
      const context = canvas.getContext('2d');
      context.fillStyle = '#bc532a'; context.fillRect(0, 0, 800, 600);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      const dt = new DataTransfer();
      for (let n = 1; n <= ${count}; n++) dt.items.add(new File([blob], 'photo-' + n + '.jpg', {type: 'image/jpeg'}));
      const input = document.querySelector('.image-app input[type=file]'); input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    })()`);
    await waitFor(`document.querySelectorAll('.image-list-item').length === ${count}`);
    await click(".image-settings-panel > button");
    await waitFor(`document.querySelectorAll('.image-list-item .result-label').length === ${count} && !document.querySelector('.image-settings-panel > button .spin')`);
    assert.equal(await evaluate("!!document.querySelector('.download-current')"), true);
    assert.equal(await evaluate("!!document.querySelector('.image-results-summary button')"), true,
      `${route}: ${count} completed images must show batch download`);
    const label = await evaluate("document.querySelector('.image-results-summary button').textContent");
    assert.equal(label.includes("ZIP"), count > 3, `${count} images: ${label}`);
    const downloadDir = path.join(root, `${route}-${count}`);
    await mkdir(downloadDir);
    await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });
    await click(".image-results-summary button");
    const expectedFiles = count > 3 ? 1 : count;
    let names = [];
    for (let attempt = 0; attempt < 100; attempt++) {
      names = await readdir(downloadDir);
      if (names.length === expectedFiles && names.every(name => !name.endsWith(".crdownload"))) break;
      await sleep(100);
    }
    assert.equal(names.length, expectedFiles, "downloaded file count");
    if (count > 3) {
      assert.match(names[0], /\.zip$/);
      const zip = await JSZip.loadAsync(await readFile(path.join(downloadDir, names[0])));
      const entries = Object.values(zip.files).filter(entry => !entry.dir);
      assert.equal(entries.length, count, "every processed image is in the ZIP");
      for (const entry of entries) {
        const bytes = await entry.async("uint8array");
        assert.deepEqual([...bytes.slice(0, 2)], [255, 216], "entry contains JPEG bytes");
      }
    } else assert.deepEqual(names.sort(), ["photo-1.jpg", "photo-2.jpg", "photo-3.jpg"]);
    console.log(`PASS ${route}: ${count} images, ${expectedFiles} downloaded file(s)`);
  }
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    await new Promise(resolve => { chrome.once("exit", resolve); chrome.kill(); });
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
