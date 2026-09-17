import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 上报接入点的源码契约（analytics 能力：关键工具行为事件口径）。
 *
 * 组件测试用 renderToString，不执行事件处理函数，因此这里守卫的是「上报挂在哪条
 * 分支上」这一事实：成功/失败/取消三类不能互相混淆，取消不得记为失败。
 *
 * 这些断言的价值在于防止「口径漂移」这类无法靠类型系统发现的缺陷 —— 把
 * trackBatchFrameExportCancelled 换成 ...Failed 依然可以编译，但会让报表把用户
 * 主动取消算成失败。
 */

const root = new URL("../", import.meta.url);

const readSource = (path) =>
  readFile(new URL(path, root), "utf8").then((source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, ""),
  );

/** 取 `from` 之后到 `to` 之前的片段，用于把断言限定在一条分支里。 */
const between = (source, from, to) => {
  const start = source.indexOf(from);
  assert.ok(start >= 0, `源码里找不到锚点：${from}`);
  const end = source.indexOf(to, start);
  assert.ok(end > start, `源码里找不到结束锚点：${to}`);
  return source.slice(start, end);
};

test("视频取帧:成功/失败/取消分别挂在不同分支", async () => {
  const source = await readSource("src/App.tsx");

  // 单帧导出：成功在 setExported(true) 之后，失败在 catch 分支
  const singleFrame = between(source, "const exportFrame = async", "const captureFrameAt");
  assert.match(singleFrame, /setExported\(true\);[\s\S]*trackFrameExported\(\{ format \}\);/);
  assert.match(singleFrame, /catch \{\s*trackFrameExportFailed\(\);/);
  assert.ok(
    singleFrame.indexOf("trackFrameExported") < singleFrame.indexOf("trackFrameExportFailed"),
    "成功上报必须在失败上报之前的分支里",
  );

  // 批量抽帧：成功带帧数与格式，失败在 catch，取消在 cancelBatchRef 分支
  const batch = between(source, "const exportBatch = async", "const handleDrop =");
  assert.match(
    batch,
    /catch \{\s*trackBatchFrameExportFailed\(\);[\s\S]*toast\.error\("批量抽帧失败"/,
  );
  assert.match(
    batch,
    /if \(cancelBatchRef\.current\) \{\s*trackBatchFrameExportCancelled\(\);/,
  );
  assert.match(
    batch,
    /trackBatchFrameExported\(\{\s*frames: times\.length,\s*format,\s*samplingMode,\s*\}\);/,
  );
  // 取消分支在 try 内、catch 之前，且不得出现失败上报
  const cancelBranch = between(batch, "if (cancelBatchRef.current) {", "const zipUrl");
  assert.ok(
    !cancelBranch.includes("trackBatchFrameExportFailed"),
    "取消分支不得上报失败",
  );
});

test("视频压缩:完成带字节数与码率档，失败分支不含成功上报", async () => {
  const source = await readSource("src/components/video-compressor.tsx");

  assert.match(
    source,
    /trackVideoCompressSucceeded\(\{ bytes: blob\.size, bitrateLevel \}\);/,
  );
  assert.ok(
    !source.includes("trackVideoCompressSucceeded({ bytes: blob.size })"),
    "完成上报必须带码率档标签",
  );

  // 每个失败出口都上报失败，且失败回执只出现在 toast.error 之前
  const failures = source.match(/trackVideoCompressFailed\(\);/g) ?? [];
  assert.ok(failures.length >= 6, `失败出口应逐个上报，当前 ${failures.length} 处`);
  for (const anchor of [
    "当前浏览器不支持 MediaRecorder",
    "当前浏览器不支持可用的 WebM 编码",
    "无法创建画布",
    "无法采集视频流",
    "无法创建录制器",
    "无法播放视频进行压缩",
  ]) {
    const before = source.slice(Math.max(0, source.indexOf(anchor) - 120), source.indexOf(anchor));
    assert.match(before, /trackVideoCompressFailed\(\)/, `${anchor} 之前应上报失败`);
  }
});

test("图片处理:四种结局经同一处上报，取消不计入失败", async () => {
  const source = await readSource("src/tools/image-processor/ImageProcessor.tsx");

  const calls = source.match(/trackImageProcessingFinished\(/g) ?? [];
  assert.equal(calls.length, 1, "一次批量处理只应有一处上报调用");

  const call = between(source, "trackImageProcessingFinished({", "});");
  assert.match(call, /mode,/);
  assert.match(call, /total: assets\.length/);
  assert.match(call, /failed,/);
  assert.match(call, /cancelled,/);

  // 上报在 if (cancelled) 之前，结局判定交给语义助手
  assert.ok(
    source.indexOf("trackImageProcessingFinished({") <
      source.indexOf("if (cancelled) {"),
    "上报必须先于结局分支，使取消与失败都能被同一处口径覆盖",
  );
});

test("A4 排版:打印上报在 window.print 之前，且空列表不上报", async () => {
  const source = await readSource("src/tools/image-a4-layout/A4ImageLayout.tsx");

  const handler = between(source, "const handlePrint = () => {", "};");
  assert.match(handler, /if \(items\.length === 0\) return;/);
  assert.match(
    handler,
    /trackA4Printed\(\{ pages: pages\.length, colsPerRow \}\);/,
  );
  assert.ok(
    handler.indexOf("trackA4Printed") < handler.indexOf("window.print()"),
    "上报应发生在打印对话框之前",
  );
});

test("路由统计:首帧不补报，且入口只在 OfflineToolsApp 挂载一次", async () => {
  const app = await readSource("src/OfflineToolsApp.tsx");
  assert.match(
    app,
    /useRouteAnalytics\(route, \{ isProduction: import\.meta\.env\.PROD \}\);/,
  );

  const hook = await readSource("src/lib/route-analytics.ts");
  assert.match(hook, /useRef<ReportedRoute>\(null\)/, "历史路由初值必须是 null");
  assert.match(hook, /if \(previous === null \|\| previous === route\) return route;/);
});

test("打印输出不含许可页脚（统计说明不印到 A4 纸上）", async () => {
  const css = await readSource("src/index.css");

  // 取出 @media print 区块（按大括号配平，区块内还有嵌套规则）
  const start = css.indexOf("@media print");
  assert.ok(start >= 0, "index.css 缺少 @media print 区块");
  let depth = 0;
  let end = start;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  const printBlock = css.slice(start, end);

  // 隐藏列表里必须同时包含许可页脚与 ICP 页脚
  for (const selector of [".license-footer", ".icp-footer"]) {
    assert.ok(
      printBlock.includes(`${selector},`) || printBlock.includes(`${selector} {`),
      `@media print 的隐藏列表缺少 ${selector}`,
    );
  }
  assert.ok(
    /\.icp-footer,\s*\.license-footer,\s*\.pwa-status\s*\{/.test(printBlock),
    "许可页脚应与 ICP 页脚同处一条隐藏规则",
  );
});
