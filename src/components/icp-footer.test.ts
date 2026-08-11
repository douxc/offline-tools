import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IcpFooter } from "./icp-footer";

describe("IcpFooter", () => {
  it("renders the ICP filing link with exact text, href, target and rel", () => {
    const html = renderToString(createElement(IcpFooter));

    assert.match(html, /class="icp-footer"/);
    assert.match(html, /href="https:\/\/beian\.miit\.gov\.cn\/"/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /苏ICP备2024075067号-4/);
  });
});
