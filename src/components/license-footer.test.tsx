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

  it("统计说明与「不上传文件」声明同时出现，不互相替代", () => {
    const html = renderToString(createElement(LicenseFooter));

    assert.match(html, /不上传文件/);
    assert.match(html, /百度统计/);
    assert.match(html, /license-footer-analytics/);
    // 披露与声明并列在同一页脚内，而不是取而代之
    assert.ok(
      html.indexOf("不上传文件") < html.indexOf("百度统计"),
      "页脚应同时保留不上传声明与统计说明",
    );
  });
});
