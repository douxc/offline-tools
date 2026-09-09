import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Popconfirm } from "@/components/ui/popconfirm";

describe("Popconfirm", () => {
  it("渲染触发按钮并携带弹层语义属性", () => {
    const html = renderToString(
      createElement(
        Popconfirm,
        {
          trigger: createElement("button", { type: "button" }, "清空图片"),
          title: "确认清空？",
          description: "将移除全部 5 张图片",
          onConfirm: () => {},
        },
      ),
    );

    assert.match(html, /清空图片/);
    assert.match(html, /aria-haspopup/);
  });

  it("确认前不执行 onConfirm（SSR 关闭态）", () => {
    let called = false;
    const html = renderToString(
      createElement(
        Popconfirm,
        {
          trigger: createElement("button", { type: "button" }, "重新选择"),
          title: "确认重新选择？",
          onConfirm: () => {
            called = true;
          },
        },
      ),
    );

    assert.match(html, /重新选择/);
    assert.equal(called, false);
  });
});
