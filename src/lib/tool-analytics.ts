/**
 * 工具行为事件的语义助手。
 *
 * 调用点分散在 5 个工具组件里，直接在各处拼 `_hmt` 参数会让「类别/动作拼错」只能
 * 靠人工审查发现。这里把口径收敛到一处：固定枚举 + 明确的完成/失败/取消三态，
 * 并保证取消永远不会被记为失败。
 *
 * 值只承载张数、帧数、字节数、页数等无用户语义的计数；标签只使用站点自身定义的
 * 固定取值（格式、抽样方式、码率档等），绝不包含文件名或用户输入。
 */
import {
  isAnalyticsActive,
  trackAnalyticsEvent,
  type AnalyticsCategory,
  type AnalyticsEnvironment,
  type DocumentLike,
  type WindowLike,
} from "@/lib/analytics";

/** 百度统计的数值参数只接受正整数；空文件或零值不上报该参数。 */
const positiveCount = (value: number): number | undefined =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;

const track = (
  environment: AnalyticsEnvironment,
  category: AnalyticsCategory,
  action: Parameters<typeof trackAnalyticsEvent>[2],
  label?: string,
  value?: number,
): void => {
  trackAnalyticsEvent(
    environment,
    category,
    action,
    label,
    value === undefined ? undefined : positiveCount(value),
  );
};

/**
 * 组件调用点用的包装。
 *
 * 两重门：统计未放行（开发、离线、标识为空）时整通调用变成空操作，因此事件既不
 * 排队也不上报 —— 离线期间的行为不会在联网后被补发；非浏览器环境同样空操作。
 * 环境在调用时才取（而不是模块加载时），避免服务端渲染或测试里引用 `window`；
 * 显式注入环境时则完全绕开浏览器全局，使这些助手可直接单测。
 */
const withEnvironment = (
  injected: AnalyticsEnvironment | undefined,
  call: (environment: AnalyticsEnvironment) => void,
): void => {
  if (!isAnalyticsActive()) return;
  if (injected) {
    call(injected);
    return;
  }
  if (typeof window === "undefined") return;
  const windowRef = window as unknown as WindowLike;
  call({
    document: document as unknown as DocumentLike,
    navigator: windowRef.navigator,
    host: windowRef,
  });
};

/* ------------------------------- 视频取帧 ------------------------------- */

/** 单帧导出成功（格式为标签）。 */
export const trackFrameExported = (
  options: { format: string },
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) => track(env, "video-frame", "export-frame", options.format));
};

/** 单帧导出失败。 */
export const trackFrameExportFailed = (
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) => track(env, "video-frame", "export-frame", "failed"));
};

/** 批量抽帧导出成功：帧数为数值，格式与抽样方式进标签。 */
export const trackBatchFrameExported = (
  options: { frames: number; format: string; samplingMode: string },
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) =>
    track(
      env,
      "video-frame",
      "export-batch",
      `${options.format}/${options.samplingMode}`,
      options.frames,
    ),
  );
};

/** 批量抽帧导出失败。 */
export const trackBatchFrameExportFailed = (
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) => track(env, "video-frame", "export-batch", "failed"));
};

/** 批量抽帧导出被用户取消（取消不等于失败）。 */
export const trackBatchFrameExportCancelled = (
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) => track(env, "video-frame", "cancel", "export-batch"));
};

/* ------------------------------- 视频压缩 ------------------------------- */

/** 视频压缩完成：输出字节数为数值，码率档进标签。 */
export const trackVideoCompressSucceeded = (
  options: { bytes: number; bitrateLevel: string },
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) =>
    track(env, "video-compress", "compress", options.bitrateLevel, options.bytes),
  );
};

/** 视频压缩失败（含环境不支持、录制器创建失败等）。 */
export const trackVideoCompressFailed = (
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) => track(env, "video-compress", "compress", "failed"));
};

/* --------------------------- 图片压缩 / 水印 --------------------------- */

/** 图片批量处理的四种结局。`partial` 表示部分成功、部分失败。 */
export type ImageProcessingOutcome = "success" | "partial" | "failed" | "cancelled";

/**
 * 图片批量处理结束：一次调用只上报一次，结局按 failed/total 判定 ——
 * 全部成功记 `success`、部分失败记 `partial`、全部失败记 `failed`；
 * 被用户取消时只记 `cancel`，不叠加失败事件（取消是用户主动行为）。
 */
export const trackImageProcessingFinished = (
  options: {
    mode: "compress" | "watermark";
    total: number;
    failed: number;
    cancelled?: boolean;
  },
  environment?: AnalyticsEnvironment,
): void => {
  const category: AnalyticsCategory =
    options.mode === "compress" ? "image-compress" : "image-watermark";

  if (options.cancelled) {
    withEnvironment(environment, (env) => track(env, category, "cancel", "process", options.total));
    return;
  }

  const failed = positiveCount(options.failed) ?? 0;
  const outcome: ImageProcessingOutcome =
    failed === 0 ? "success" : failed >= options.total ? "failed" : "partial";
  withEnvironment(environment, (env) =>
    track(env, category, "process", outcome, options.total),
  );
};

/* ----------------------------- A4 排版打印 ----------------------------- */

/** 调用浏览器打印 A4 版面：页数为数值，每行张数进标签。 */
export const trackA4Printed = (
  options: { pages: number; colsPerRow: number },
  environment?: AnalyticsEnvironment,
): void => {
  withEnvironment(environment, (env) =>
    track(
      env,
      "image-a4-layout",
      "print",
      `${options.colsPerRow}-per-row`,
      options.pages,
    ),
  );
};
