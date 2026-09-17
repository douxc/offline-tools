import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  activateAnalytics,
  isAnalyticsActive,
  resetAnalyticsActivation,
  type AnalyticsCommand,
  type AnalyticsEnvironment,
} from "./analytics";
import {
  trackA4Printed,
  trackBatchFrameExportCancelled,
  trackBatchFrameExportFailed,
  trackBatchFrameExported,
  trackFrameExportFailed,
  trackFrameExported,
  trackImageProcessingFinished,
  trackVideoCompressFailed,
  trackVideoCompressSucceeded,
} from "./tool-analytics";

// 事件上报受统计总开关约束（离线/开发/未加载时不排队）：这里显式放行，
// 「未放行时什么都不做」由文件末尾的专项用例覆盖。
beforeEach(() => activateAnalytics());
afterEach(() => resetAnalyticsActivation());

/** 只保留队列，不需要 document/navigator：助手只负责把命令放进队列。 */
const createQueue = () => {
  const environment = {
    document: {} as AnalyticsEnvironment["document"],
    navigator: { onLine: true },
    host: { addEventListener: () => {} },
  } satisfies AnalyticsEnvironment;

  return {
    environment,
    queue: () => (environment.host._hmt ?? []) as AnalyticsCommand[],
    last: () => {
      const queue = environment.host._hmt ?? [];
      return queue[queue.length - 1];
    },
  };
};

describe("视频取帧事件口径", () => {
  it("单帧导出成功带格式，失败不带数值", () => {
    const env = createQueue();
    trackFrameExported({ format: "png" }, env.environment);
    assert.deepEqual(env.last(), ["_trackEvent", "video-frame", "export-frame", "png"]);

    trackFrameExportFailed(env.environment);
    assert.deepEqual(env.last(), [
      "_trackEvent",
      "video-frame",
      "export-frame",
      "failed",
    ]);
  });

  it("批量导出带帧数与格式/抽样方式，失败与取消分开记", () => {
    const env = createQueue();
    trackBatchFrameExported(
      { frames: 12, format: "png", samplingMode: "interval" },
      env.environment,
    );
    assert.deepEqual(env.last(), [
      "_trackEvent",
      "video-frame",
      "export-batch",
      "png/interval",
      12,
    ]);

    trackBatchFrameExportFailed(env.environment);
    assert.deepEqual(env.last(), [
      "_trackEvent",
      "video-frame",
      "export-batch",
      "failed",
    ]);

    trackBatchFrameExportCancelled(env.environment);
    assert.deepEqual(env.last(), ["_trackEvent", "video-frame", "cancel", "export-batch"]);
  });
});

describe("视频压缩事件口径", () => {
  it("完成带字节数与码率档，失败不产生成功事件", () => {
    const env = createQueue();
    trackVideoCompressSucceeded(
      { bytes: 2_048_000, bitrateLevel: "medium" },
      env.environment,
    );
    assert.deepEqual(env.last(), [
      "_trackEvent",
      "video-compress",
      "compress",
      "medium",
      2_048_000,
    ]);

    trackVideoCompressFailed(env.environment);
    assert.deepEqual(env.last(), [
      "_trackEvent",
      "video-compress",
      "compress",
      "failed",
    ]);
    assert.equal(
      env.queue().filter((command) => command[3] === "medium").length,
      1,
      "失败不应新增成功事件",
    );
  });
});

describe("图片批量处理事件口径", () => {
  const cases = [
    { failed: 0, cancelled: false, expected: "success" },
    { failed: 2, cancelled: false, expected: "partial" },
    { failed: 3, cancelled: false, expected: "failed" },
  ] as const;

  for (const testCase of cases) {
    it(`total=3 failed=${testCase.failed} 记为 ${testCase.expected}`, () => {
      const env = createQueue();
      trackImageProcessingFinished(
        { mode: "compress", total: 3, failed: testCase.failed },
        env.environment,
      );
      assert.deepEqual(env.last(), [
        "_trackEvent",
        "image-compress",
        "process",
        testCase.expected,
        3,
      ]);
    });
  }

  it("取消走 cancel 动作，不记为失败", () => {
    const env = createQueue();
    trackImageProcessingFinished(
      { mode: "watermark", total: 3, failed: 1, cancelled: true },
      env.environment,
    );
    assert.deepEqual(env.last(), [
      "_trackEvent",
      "image-watermark",
      "cancel",
      "process",
      3,
    ]);
    assert.ok(
      !env.queue().some((command) => command[3] === "failed"),
      "取消不应产生 failed 事件",
    );
  });

  it("水印模式归到 image-watermark 类别", () => {
    const env = createQueue();
    trackImageProcessingFinished(
      { mode: "watermark", total: 4, failed: 0 },
      env.environment,
    );
    assert.equal(env.last()[1], "image-watermark");
  });
});

describe("A4 排版打印事件口径", () => {
  it("带页数与每行张数", () => {
    const env = createQueue();
    trackA4Printed({ pages: 3, colsPerRow: 4 }, env.environment);
    assert.deepEqual(env.last(), [
      "_trackEvent",
      "image-a4-layout",
      "print",
      "4-per-row",
      3,
    ]);
  });
});

describe("数值与标签不会承载用户数据", () => {
  it("零值与非法值不产生数值参数", () => {
    const env = createQueue();
    trackVideoCompressSucceeded({ bytes: 0, bitrateLevel: "low" }, env.environment);
    assert.deepEqual(env.last(), ["_trackEvent", "video-compress", "compress", "low"]);
  });
});

describe("统计总开关（离线不排队、不补报）", () => {
  it("未放行时事件不排队，放行后照常上报", () => {
    resetAnalyticsActivation();
    const env = createQueue();

    trackFrameExported({ format: "png" }, env.environment);
    trackBatchFrameExported(
      { frames: 5, format: "png", samplingMode: "interval" },
      env.environment,
    );
    assert.equal(isAnalyticsActive(), false);
    assert.deepEqual(env.queue(), [], "未放行时不得写入 _hmt 队列");

    activateAnalytics();
    trackFrameExported({ format: "png" }, env.environment);
    assert.equal(env.queue().length, 1, "放行后才开始入队");
  });
});
