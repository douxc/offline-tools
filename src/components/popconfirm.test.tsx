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

describe("Popconfirm 焦点落点(决议 2026-09-17)", () => {
  it("初始焦点绑定取消键 —— 避免误按 Return 触发破坏性动作", () => {
    const html = renderToString(
      createElement(Popconfirm, {
        trigger: createElement("button", { type: "button" }, "清空图片"),
        title: "确认清空全部图片？",
        description: "将移除全部 5 张图片。",
        onConfirm: () => {},
      }),
    );
    // SSR 下弹层未挂载;此处断言触发按钮语义与组件可渲染,
    // 焦点落点由源码级契约测试守卫(见 tests/confirmation-focus-embed.test.mjs)
    assert.match(html, /清空图片/);
  });
});
