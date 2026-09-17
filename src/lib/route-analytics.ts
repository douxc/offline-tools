/**
 * 路由级统计接入（PV）。
 *
 * 只做两件事：挂载时按加载门决定是否加载统计脚本；路由真正变化时补发一次 PV。
 * 首次渲染**不**上报 —— 入口 HTML 的整页加载已由 hm.js 自动记一次，补发会把每个
 * 入口的 PV 翻倍（见 design.md 决策 3）。
 *
 * 判定与上报都在纯函数（`reportRouteChange`）里，React 层只负责把状态喂进去，
 * 因此「首帧不重复上报」「统计未就绪不上报」都能被单元测试穷举。
 */
import { useEffect, useRef } from "react";
import {
  activateAnalytics,
  ANALYTICS_META_NAME,
  loadAnalytics,
  trackPageView,
  type AnalyticsCommand,
  type AnalyticsEnvironment,
  type DocumentLike,
  type WindowLike,
} from "@/lib/analytics";
import { SEO_PAGES } from "@/lib/seo";
import type { ToolRoute } from "@/lib/tool-navigation";

/**
 * 浏览器环境适配层。
 *
 * 纯策略（加载门、队列、上报口径）都在 `analytics.ts`，且刻意不引用 DOM 全局 ——
 * `vite.config.ts` 也要 import 那个模块。所有触碰 `window`/`document` 的代码都留在
 * 这个只在浏览器里加载的文件里。
 */
const browserEnvironment = (): AnalyticsEnvironment => {
  const windowRef = window as unknown as WindowLike;
  return {
    document: document as unknown as DocumentLike,
    navigator: windowRef.navigator,
    host: windowRef,
    requestIdleCallback: windowRef.requestIdleCallback?.bind(windowRef),
    setTimeout: windowRef.setTimeout.bind(windowRef),
  };
};

/** 预先建好 `_hmt` 队列，避免第三方脚本读得过早而丢失上报。 */
const ensureQueue = (): AnalyticsCommand[] => {
  const windowRef = window as unknown as WindowLike;
  if (!Array.isArray(windowRef._hmt)) windowRef._hmt = [];
  return windowRef._hmt;
};

/**
 * 读取 HTML 里注入的统计站点标识；缺失时返回空串（表示不启用统计）。
 *
 * 接受 document 替身，使这条读取路径可以被单元测试直接驱动。
 */
export const readSiteIdFromMeta = (
  documentRef: Pick<Document, "querySelector"> = document,
): string =>
  documentRef
    .querySelector(`meta[name="${ANALYTICS_META_NAME}"]`)
    ?.getAttribute("content")
    ?.trim() ?? "";

export type RouteAnalyticsOptions = {
  /** 生产构建判定；开发与预览环境不加载统计脚本。 */
  isProduction: boolean;
  /** 环境替身（仅测试注入），默认取浏览器全局。 */
  environment?: AnalyticsEnvironment;
  /** 站点标识读取替身（仅测试注入），默认读 HTML 里的 meta。 */
  readSiteId?: () => string;
};

/** 已上报过的路由，作为「首帧要不要补报」的判据。 */
export type ReportedRoute = ToolRoute | null;

/**
 * 决定并执行一次路由级补报。
 *
 * 补报需要同时满足三条：统计已就绪（脚本已排入插入或已登记恢复在线的重试）、
 * 已有历史路由、且当前路由与历史不同。首次渲染（previous 为 null）一律不报 ——
 * 整页加载的 PV 由 hm.js 自己记。
 *
 * @returns 新的「已上报路由」，供调用方保存。
 */
export const reportRouteChange = (
  environment: AnalyticsEnvironment | null,
  previous: ReportedRoute,
  route: ToolRoute,
  isReady: boolean,
): ReportedRoute => {
  if (!isReady || !environment) return previous;
  if (previous === null || previous === route) return route;
  trackPageView(environment, SEO_PAGES[route].path);
  return route;
};

export const useRouteAnalytics = (
  route: ToolRoute,
  options: RouteAnalyticsOptions,
): void => {
  const environmentRef = useRef<AnalyticsEnvironment | null>(null);
  /** 只有统计真正就绪后才允许上报，避免离线期间的命令在联网后被补发。 */
  const readyRef = useRef(false);
  const reportedRef = useRef<ReportedRoute>(null);

  useEffect(() => {
    // 有注入的替身时用它；否则只在这个模块的宿主（浏览器）里工作。
    const environment =
      options.environment ??
      (typeof window === "undefined" ? null : browserEnvironment());
    if (!environment) return;
    environmentRef.current = environment;
    if (!options.environment) ensureQueue();

    const siteId = (options.readSiteId ?? readSiteIdFromMeta)();
    loadAnalytics(environment, {
      isProduction: options.isProduction,
      siteId,
      onReady: () => {
        readyRef.current = true;
        // 工具事件按同一开关放行：统计未就绪时（开发、离线、标识为空）
        // 事件既不排队也不上报，因此离线期间的行为不会被联网后补发。
        activateAnalytics();
      },
    });
  }, [options.environment, options.isProduction, options.readSiteId]);

  useEffect(() => {
    reportedRef.current = reportRouteChange(
      environmentRef.current,
      reportedRef.current,
      route,
      readyRef.current,
    );
  }, [route]);
};
