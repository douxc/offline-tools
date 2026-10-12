import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { BatchSamplingControls } from "./batch-sampling-controls";
import type { SamplingMode } from "@/lib/frame-sampling";
import type { LocaleCode } from "@/lib/i18n/locales";
import { withLocale } from "@/lib/i18n/test-locale";

/** SSR 测试没有 provider 时退回默认语言，因此断言文案要显式指定语言。 */
const render = (
  props: Parameters<typeof BatchSamplingControls>[0],
  locale: LocaleCode = "zh-CN",
) => renderToString(withLocale(createElement(BatchSamplingControls, props), locale));

describe("BatchSamplingControls", () => {
  it("AC-11: renders three labeled options, checked on the current mode only", () => {
    const html = render({
      mode: "evenly" as SamplingMode,
      onModeChange: () => {},
    });

    assert.match(html, /按时间间隔/);
    assert.match(html, /按帧数间隔/);
    assert.match(html, /均匀取张数/);

    // shadcn 单选 ToggleGroup 暴露 role=radio + aria-checked 语义
    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-label="抽取模式"/);
    const checked = html.match(/aria-checked="true"[^>]*>([^<]*)</)?.[1];
    assert.equal(checked, "均匀取张数", "仅当前模式应为选中项");
    assert.equal(
      (html.match(/aria-checked="true"/g) ?? []).length,
      1,
      "只应有一个选中项",
    );
  });

  it("选中项同时携带 data-state=on,不只依赖颜色", () => {
    const html = render({
      mode: "step" as SamplingMode,
      onModeChange: () => {},
    });
    assert.match(html, /data-state="on"[^>]*>按帧数间隔</);
    assert.equal((html.match(/data-state="on"/g) ?? []).length, 1);
  });

  it("选项与 aria-label 随语言变化", () => {
    const en = render({ mode: "evenly", onModeChange: () => {} }, "en");
    assert.match(en, /By time interval/);
    assert.match(en, /By frame step/);
    assert.match(en, /Even count/);
    assert.match(en, /aria-label="Sampling mode"/);

    const ja = render({ mode: "evenly", onModeChange: () => {} }, "ja");
    assert.match(ja, /時間間隔で/);
    assert.match(ja, /枚数を均等に/);
    assert.match(ja, /aria-label="抽出モード"/);
  });
});
