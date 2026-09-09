import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { LicenseFooter } from "./license-footer";

describe("LicenseFooter", () => {
  it("渲染 GPL 声明与两个许可链接", () => {
    const html = renderToString(createElement(LicenseFooter));

    assert.match(html, /GPL-3\.0-or-later/);
    assert.match(html, /href="\/legal\/THIRD_PARTY_NOTICES\.md"/);
    assert.match(html, /href="\/legal\/CORRESPONDING_SOURCE\.md"/);
    assert.match(html, /本地处理/);
  });
});
