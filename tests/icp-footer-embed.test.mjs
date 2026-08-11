import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("main.tsx mounts IcpFooter globally inside ThemeProvider", async () => {
  const mainSrc = await readFile(new URL("src/main.tsx", root), "utf8");

  assert.match(
    mainSrc,
    /import \{[^}]*IcpFooter[^}]*\} from "@\/components\/icp-footer"/,
  );

  const open = mainSrc.indexOf("<ThemeProvider");
  const close = mainSrc.indexOf("</ThemeProvider>");
  assert.ok(open !== -1 && close !== -1 && close > open);
  const renderTree = mainSrc.slice(open, close);
  assert.match(renderTree, /<IcpFooter \/>/);
});

test("index.css defines .icp-footer as a fixed bottom bar up to 36px tall", async () => {
  const css = await readFile(new URL("src/index.css", root), "utf8");
  const block = css.match(/\.icp-footer\s*\{([^}]*)\}/);
  assert.ok(block, ".icp-footer rule block is missing");

  const decl = block[1];
  assert.match(decl, /position:\s*fixed/);
  assert.match(decl, /bottom:\s*0/);
  assert.match(decl, /left:\s*0/);
  assert.match(decl, /right:\s*0/);
  assert.match(decl, /z-index:\s*15/);

  const height = decl.match(/height:\s*(\d+(?:\.\d+)?)px/);
  assert.ok(height, ".icp-footer must declare an explicit pixel height");
  assert.ok(
    Number(height[1]) <= 36,
    `.icp-footer height ${height[1]}px exceeds 36px`,
  );
});

test("error-toast bottom clears the fixed ICP bar (>= 40px)", async () => {
  const css = await readFile(new URL("src/index.css", root), "utf8");
  const block = css.match(/\.error-toast\s*\{([^}]*)\}/);
  assert.ok(block, ".error-toast rule block is missing");

  const decl = block[1];
  const bottom = decl.match(/bottom:\s*(\d+)px/);
  assert.ok(bottom, ".error-toast must declare a pixel bottom value");
  assert.ok(
    Number(bottom[1]) >= 40,
    `.error-toast bottom ${bottom[1]}px is less than 40px`,
  );
});
