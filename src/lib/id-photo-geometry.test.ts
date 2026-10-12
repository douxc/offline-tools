import assert from "node:assert/strict";
import { isLocalizedError } from "@/lib/i18n/localized-error";
import { test } from "node:test";
import { ID_PHOTO_PRESETS, ID_PHOTO_PPI } from "./id-photo-presets";
import { CENTERED_CROP, cropGeometry, moveCrop, resizeDimensions, validTarget } from "./id-photo-geometry";

test("一寸、二寸像素按 300 PPI 换算", () => {
  for (const preset of ID_PHOTO_PRESETS) {
    assert.equal(preset.width, Math.round(preset.widthMm / 25.4 * ID_PHOTO_PPI));
    assert.equal(preset.height, Math.round(preset.heightMm / 25.4 * ID_PHOTO_PPI));
  }
  assert.deepEqual(ID_PHOTO_PRESETS.map(p => [p.width, p.height]), [[295, 413], [413, 579]]);
});

test("不同宽高比和小图放大始终覆盖，极端拖动不越界", () => {
  for (const source of [{ width: 1200, height: 800 }, { width: 800, height: 1200 }, { width: 200, height: 300 }, { width: 295, height: 413 }]) {
    for (const target of ID_PHOTO_PRESETS) {
      for (const zoom of [1, 2, 4]) {
        for (const [cx, cy] of [[0.5, 0.5], [-100, 100], [100, -100]]) {
          const { rect, scale } = cropGeometry(source, target, { cx, cy, zoom });
          assert.ok(rect.x >= -1e-8 && rect.y >= -1e-8);
          assert.ok(rect.x + rect.width <= source.width + 1e-8);
          assert.ok(rect.y + rect.height <= source.height + 1e-8);
          assert.ok(Math.abs(rect.width * scale - target.width) < 1e-8);
          assert.ok(Math.abs(rect.height * scale - target.height) < 1e-8);
        }
      }
    }
  }
});

test("窗口尺寸变化仅改变显示系数，等比例拖动得到相同源区域", () => {
  const source = { width: 1200, height: 800 }, target = ID_PHOTO_PRESETS[0];
  const position = { ...CENTERED_CROP, zoom: 2 };
  const first = moveCrop(source, target, position, 20, 10, 295);
  const second = moveCrop(source, target, position, 40, 20, 590);
  assert.deepEqual(first, second);
  assert.ok(first.cx < 0.5 && first.cy < 0.5);
  assert.deepEqual(cropGeometry(source, target, first).rect, cropGeometry(source, target, second).rect);
  const zoomed = cropGeometry(source, target, { ...first, zoom: 4 }).position;
  assert.equal(zoomed.cx, first.cx);
  assert.equal(zoomed.cy, first.cy);
});

test("自定义只缩小，取整至少为一个像素", () => {
  assert.deepEqual(resizeDimensions({ width: 1200, height: 800 }, "width", "600"), { width: 600, height: 400 });
  assert.deepEqual(resizeDimensions({ width: 1000, height: 667 }, "height", "300"), { width: 450, height: 300 });
  assert.deepEqual(resizeDimensions({ width: 60000, height: 1 }, "width", "1"), { width: 1, height: 1 });
  // 纯函数现在抛**错误码**（由界面层翻译），因此断言码而不是某种语言的文案
  assert.throws(
    () => resizeDimensions({ width: 400, height: 600 }, "width", "600"),
    (error: unknown) =>
      isLocalizedError(error) && error.code === "err.idPhoto.cannotUpscale",
  );
  for (const text of ["", "-1", "0", "1.5", "NaN", "Infinity", "9007199254740992"]) {
    assert.equal(validTarget(text), false);
    assert.throws(() => resizeDimensions({ width: 1200, height: 800 }, "width", text));
  }
});
