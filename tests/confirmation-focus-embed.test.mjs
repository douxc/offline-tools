import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * 破坏性确认的焦点落点契约。
 *
 * 决议(2026-09-17):破坏性 Popconfirm 打开时初始焦点落在**取消键**。
 * 依据:Apple Buttons 要求不得为破坏性动作分配 primary 角色,但未规定确认框默认
 * 焦点,故由人工裁决取更安全的一侧 —— 避免按 Return 直接触发不可逆的清空/重置。
 *
 * 该行为无法用 SSR 断言(弹层在客户端才挂载),因此以源码级契约守卫。
 */

const root = new URL("../", import.meta.url);

test("Popconfirm 初始焦点落在取消键而非确认键", async () => {
  const source = await readFile(
    new URL("src/components/ui/popconfirm.tsx", root),
    "utf8",
  );

  // 取消键持有 ref 并成为 onOpenAutoFocus 的目标
  assert.match(source, /const cancelRef = React\.useRef<HTMLButtonElement>\(null\)/);
  assert.match(source, /cancelRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(
    source,
    /confirmRef\.current\?\.focus\(\)/,
    "确认键不得成为初始焦点目标",
  );
  // 取消键是第一个可聚焦控件(先于确认键出现)
  const cancelAt = source.indexOf("ref={cancelRef}");
  const confirmLabelAt = source.indexOf("{confirmLabel}");
  assert.ok(
    cancelAt > 0 && cancelAt < confirmLabelAt,
    "取消键应在确认键之前,与焦点落点一致",
  );
});

test("破坏性确认键使用 destructive variant 且不带尺寸覆盖", async () => {
  const source = await readFile(
    new URL("src/components/ui/popconfirm.tsx", root),
    "utf8",
  );
  assert.match(source, /confirmVariant = "destructive"/, "默认应为破坏性配色");
  // 尺寸交由 shadcn size 档位,不再用 min-h 覆盖
  assert.doesNotMatch(
    source,
    /min-h-11/,
    "确认框按钮不应以 min-h 覆盖 shadcn 的 size 档位",
  );
});
