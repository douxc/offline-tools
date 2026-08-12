import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

const flatSource = async (path) => {
  const src = await readFile(new URL(path, root), "utf8");
  return src.replace(/\s+/g, " ");
};

test("AC-7: App.tsx burns the text overlay into the exported frame", async () => {
  const src = await flatSource("src/App.tsx");

  assert.match(src, /import \{[^}]*computeTextOverlay[^}]*\} from "@\/lib\/text-overlay"/);
  assert.match(src, /import \{[^}]*drawTextOverlay[^}]*\} from "@\/lib\/text-overlay"/);
  assert.match(src, /import \{[^}]*shouldBurnOverlay[^}]*\} from "@\/lib\/text-overlay"/);
  assert.match(src, /import \{[^}]*TextOverlayPanel[^}]*\} from "@\/components\/text-overlay-panel"/);

  const drawImageIdx = src.indexOf("context.drawImage");
  const guardIdx = src.indexOf("shouldBurnOverlay(textEnabled, overlayText)");
  const burnIdx = src.indexOf("drawTextOverlay( context, computeTextOverlay(");
  const toBlobIdx = src.indexOf("canvas.toBlob");

  assert.ok(drawImageIdx !== -1, "context.drawImage is missing");
  assert.ok(guardIdx !== -1, "shouldBurnOverlay(textEnabled, overlayText) is missing");
  assert.ok(burnIdx !== -1, "drawTextOverlay( context, computeTextOverlay( is missing");
  assert.ok(toBlobIdx !== -1, "canvas.toBlob is missing");

  assert.ok(
    drawImageIdx < guardIdx && guardIdx < burnIdx && burnIdx < toBlobIdx,
    "burn call must sit between drawImage and toBlob, guarded by shouldBurnOverlay",
  );
});

test("AC-7: the preview renders a text overlay inside the video stage", async () => {
  const src = await flatSource("src/App.tsx");

  const stageIdx = src.indexOf("video-stage");
  const overlayIdx = src.indexOf("className={`text-overlay");
  assert.ok(stageIdx !== -1, "video-stage is missing");
  assert.ok(
    overlayIdx > stageIdx,
    "text-overlay element must live inside the video stage",
  );
});

test("AC-7: index.css defines the .text-overlay preview styles", async () => {
  const css = await readFile(new URL("src/index.css", root), "utf8");
  assert.match(css, /\.text-overlay\s*\{/);
});

test("AC-8: package.json test script includes the new test files", async () => {
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  const testScript = pkg.scripts.test;

  assert.ok(
    typeof testScript === "string" && testScript.length > 0,
    "package.json must declare a test script",
  );
  assert.match(testScript, /src\/lib\/text-overlay\.test\.ts/);
  assert.match(testScript, /src\/components\/text-overlay-panel\.test\.tsx/);
  assert.match(testScript, /tests\/text-overlay-embed\.test\.mjs/);
});
