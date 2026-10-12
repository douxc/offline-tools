import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "@/lib/theme";
import { IdPhoto } from "./IdPhoto";
import { CropPreview } from "./CropPreview";
import { DEFAULT_ID_PHOTO_PRESET } from "@/lib/id-photo-presets";
import { withLocale } from "@/lib/i18n/test-locale";
import type { PhotoAsset } from "@/lib/id-photo-assets";

test("证件照空状态提供唯一导入操作、正确导航和许可说明", () => {
  const html = renderToString(
    withLocale(
      createElement(ThemeProvider, { initialTheme: "dark" }, createElement(IdPhoto)),
      "zh-CN",
    ),
  );
  assert.match(html, /<h1>证件照<\/h1>/);
  assert.match(html, /选择图片/);
  assert.doesNotMatch(html, /处理全部|清空图片|下载当前图片/);
  // 中文页面的 tab 链接带 /zh 前缀（站内链接跟随当前语言）
  assert.match(html, /href="\/zh\/id-photo\/"[^>]*aria-selected="true"/);
  assert.match(html, /GPL-3\.0-or-later/);
  assert.match(html, /300 PPI/);
});

test("裁切预览具有键盘入口、操作说明与等比图像布局", () => {
  const asset = { id: "a", url: "blob:photo", width: 1200, height: 800, crop: { cx: 0.5, cy: 0.5, zoom: 2 } } as PhotoAsset;
  // 断言中文无障碍标签需显式包 zh-CN provider
  const html = renderToString(
    withLocale(
      createElement(CropPreview, { asset, target: DEFAULT_ID_PHOTO_PRESET, disabled: false, onChange: () => {} }),
      "zh-CN",
    ),
  );
  assert.match(html, /role="application"[^>]*tabindex="0"/);
  assert.match(html, /方向键微调/);
  assert.match(html, /id-photo-crop-frame/);
  assert.match(html, /draggable="false"/);
  const disabled = renderToString(
    withLocale(
      createElement(CropPreview, { asset, target: DEFAULT_ID_PHOTO_PRESET, disabled: true, onChange: () => {} }),
      "zh-CN",
    ),
  );
  assert.match(disabled, /tabindex="-1"/);
  assert.match(disabled, /aria-disabled="true"/);

  // 无障碍标签随语言变化
  const en = renderToString(
    withLocale(
      createElement(CropPreview, { asset, target: DEFAULT_ID_PHOTO_PRESET, disabled: false, onChange: () => {} }),
      "en",
    ),
  );
  assert.match(en, /Crop preview/);
  assert.doesNotMatch(en, /方向键微调/);
});
