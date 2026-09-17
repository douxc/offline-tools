/**
 * 站点访问统计的唯一接入模块。
 *
 * 三条边界，缺一不可：
 * 1. 只有百度统计一条通道（`hm.baidu.com/hm.js`），站点标识只在这里定义一次。
 * 2. 只在生产构建且浏览器在线时加载；离线不加载、不排队、不补报。
 * 3. 加载与上报失败一律静默 —— 统计永远不能影响工具本身。
 *
 * 对外承诺仍是「文件只在本机处理」：这里只上报页面路径与固定的工具事件口径，
 * 不采集文件内容、文件名，也不向任何浏览器存储写入数据。
 */
/** 统计脚本地址（唯一的统计通道）。 */
export const ANALYTICS_SCRIPT_HOST = "hm.baidu.com";
export const ANALYTICS_SCRIPT_URL = `https://${ANALYTICS_SCRIPT_HOST}/hm.js`;

/**
 * 内置站点标识。换统计站点只改这一处，或在构建环境提供 `VITE_ANALYTICS_ID`
 * 覆盖（空字符串显式关闭统计）。
 */
export const DEFAULT_ANALYTICS_ID = "49b103455f3a286d39f1c63602f08f8a";

/**
 * 构建期占位符。六个 HTML 入口的 `<meta name="baidu-tongji-site-id">` 用它
 * 标记标识插入点，由 vite.config.ts 的站点 URL 插件在构建期替换为
 * resolveAnalyticsId() 的结果（空值表示关闭统计，产物中不出现标识）。
 */
export const ANALYTICS_ID_TOKEN = "__ANALYTICS_ID__";

/** HTML 中承载标识的 meta 名，客户端加载门据此读取最终值。 */
export const ANALYTICS_META_NAME = "baidu-tongji-site-id";

/**
 * 解析本次构建使用的站点标识。
 *
 * - 未提供覆盖（undefined）：回退内置默认值，使无环境变量的构建环境也能产出
 *   带标识的产物。
 * - 空字符串或纯空白：显式关闭统计。
 * - 其他：使用去除首尾空白后的值。
 */
export const resolveAnalyticsId = (override?: string): string => {
  if (override === undefined) return DEFAULT_ANALYTICS_ID;
  return override.trim();
};

/** `_hmt` 命令队列的最长长度，避免脚本长期不可用时无界增长。 */
export const ANALYTICS_QUEUE_LIMIT = 64;

/**
 * 统计事件口径的固定取值。类别与动作必须来自这里，禁止由用户输入拼装；
 * 标签只承载站点自身定义的固定取值（格式、码率档、抽样方式等）。
 */
export const ANALYTICS_CATEGORIES = [
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "image-a4-layout",
] as const;

export const ANALYTICS_ACTIONS = [
  "export-frame",
  "export-batch",
  "compress",
  "process",
  "print",
  "cancel",
] as const;

export const ANALYTICS_RESULTS = ["success", "partial", "failed"] as const;

export type AnalyticsCategory = (typeof ANALYTICS_CATEGORIES)[number];
export type AnalyticsAction = (typeof ANALYTICS_ACTIONS)[number];
export type AnalyticsResult = (typeof ANALYTICS_RESULTS)[number];

/** 一条 `_hmt` 队列项。 */
export type AnalyticsCommand = unknown[];

/**
 * 统计模块只依赖下面这几个结构类型，而不是 lib.dom 的全局类型。
 *
 * 原因：`vite.config.ts` 也要 import 本模块（构建期解析标识），而它用的是
 * tsconfig.node.json（`lib: ["ES2023"]`，不含 DOM）。用工具类型引用全局 DOM 类型
 * 会把该配置的检查弄挂；用结构化接口则两边都能编译，浏览器里的真实对象天然满足。
 */
type ElementLike = {
  appendChild: (element: ElementLike) => unknown;
  getAttribute: (name: string) => string | null;
};

type ScriptElementLike = ElementLike & {
  src?: string;
  async?: boolean;
  dataset?: Record<string, string | undefined>;
};

export type DocumentLike = {
  createElement: (tagName: string) => ScriptElementLike;
  head: ElementLike;
  querySelector: (selector: string) => ElementLike | null;
};

export type NavigatorLike = { onLine: boolean };

export type WindowLike = {
  _hmt?: AnalyticsCommand[];
  addEventListener: (type: string, listener: () => void) => void;
  navigator: NavigatorLike;
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  setTimeout: (callback: () => void, delay?: number) => number;
};

/** 加载门与上报所需的浏览器环境，做成参数以便单元测试注入替身。 */
export type AnalyticsEnvironment = {
  document: DocumentLike;
  navigator: NavigatorLike;
  /** 承载 `_hmt` 队列与 online 事件的宿主对象（浏览器里是 window）。 */
  host: {
    _hmt?: AnalyticsCommand[];
    addEventListener: (type: string, listener: () => void) => void;
  };
  /** 空闲回调（缺失时退回 setTimeout）。 */
  requestIdleCallback?: (callback: () => void) => void;
  setTimeout?: (callback: () => void, delay: number) => void;
};

const readQueue = (environment: AnalyticsEnvironment): AnalyticsCommand[] => {
  const queue = environment.host._hmt;
  if (Array.isArray(queue)) return queue;
  const created: AnalyticsCommand[] = [];
  environment.host._hmt = created;
  return created;
};

const enqueue = (
  environment: AnalyticsEnvironment,
  command: AnalyticsCommand,
) => {
  const queue = readQueue(environment);
  // 脚本长期不可用（被拦截）时停止入队：不记录、不重试、不抛错。
  if (queue.length >= ANALYTICS_QUEUE_LIMIT) return;
  queue.push(command);
};

const insertScript = (environment: AnalyticsEnvironment, siteId: string) => {
  const selector = `script[data-analytics="${ANALYTICS_SCRIPT_HOST}"]`;
  if (environment.document.querySelector(selector)) return;
  const script = environment.document.createElement("script");
  script.async = true;
  script.dataset = { analytics: ANALYTICS_SCRIPT_HOST };
  script.src = `${ANALYTICS_SCRIPT_URL}?${siteId}`;
  environment.document.head.appendChild(script);
};

const scheduleInsert = (environment: AnalyticsEnvironment, siteId: string) => {
  const run = () => insertScript(environment, siteId);
  if (environment.requestIdleCallback) {
    environment.requestIdleCallback(run);
    return;
  }
  if (environment.setTimeout) {
    environment.setTimeout(run, 0);
    return;
  }
  run();
};

/**
 * 加载门：生产构建 + 标识非空 + 浏览器在线。
 *
 * 离线时只登记一次 `online` 监听，首次联网时再尝试一次；离线期间产生的路由切换
 * 与工具事件不排队、不补报 —— 因此上报方必须等到 `onReady` 被调用后才开始入队，
 * 否则离线期间积累的命令会在首次联网时被一并发出（见 route-analytics 的接线）。
 *
 * @returns 统计是否已启用（已插入脚本，或已登记恢复在线的重试）。
 */
export const loadAnalytics = (
  environment: AnalyticsEnvironment,
  options: { isProduction: boolean; siteId: string; onReady?: () => void },
): boolean => {
  if (!options.isProduction) return false;
  const siteId = options.siteId.trim();
  if (siteId === "") return false;

  const ready = () => {
    options.onReady?.();
  };

  if (!environment.navigator.onLine) {
    let armed = true;
    environment.host.addEventListener("online", () => {
      if (!armed) return;
      armed = false;
      scheduleInsert(environment, siteId);
      ready();
    });
    return true;
  }

  scheduleInsert(environment, siteId);
  ready();
  return true;
};

/** 入队一条 `_hmt` 命令（`_trackPageview` / `_trackEvent` 等）。 */
export const pushAnalyticsCommand = (
  environment: AnalyticsEnvironment,
  command: AnalyticsCommand,
): void => {
  enqueue(environment, command);
};

/**
 * 上报一次 PV。路径必须是以 `/` 开头的相对路径，且取站点规范路径
 * （与页面 canonical 一致），使百度统计的「受访页面」与规范 URL 对齐。
 */
export const trackPageView = (
  environment: AnalyticsEnvironment,
  path: string,
): void => {
  if (!path.startsWith("/")) return;
  enqueue(environment, ["_trackPageview", path]);
};

/**
 * 上报一次工具行为事件。
 *
 * 与 `_trackPageview` 不同，事件不计入 PV；类别与动作必须是固定枚举取值，
 * 数值只承载张数、帧数、字节数等无用户语义的计数。
 */
export const trackAnalyticsEvent = (
  environment: AnalyticsEnvironment,
  category: AnalyticsCategory,
  action: AnalyticsAction,
  label?: string,
  value?: number,
): void => {
  const command: AnalyticsCommand = ["_trackEvent", category, action];
  if (label !== undefined) command.push(label);
  if (value !== undefined) command.push(value);
  enqueue(environment, command);
};

/** 页面离开统计：路由变化时上报一次新路径的 PV。 */
export const trackRouteView = (
  environment: AnalyticsEnvironment,
  path: string,
): void => {
  trackPageView(environment, path);
};

/**
 * 统计的总开关：只有加载门放行（生产构建 + 标识非空 + 已在线/已恢复在线）之后
 * 才置为 true。
 *
 * 上报方（工具事件）据此决定是否入队。没有这道闸，`_hmt` 队列会在统计尚未加载时
 * 就被写入 —— 队列一旦在首次联网后由 hm.js 消费，离线期间的行为就被补报了，
 * 与「离线不排队、不补报」的契约冲突。
 */
let analyticsActive = false;

/** 由路由统计在加载门放行后调用（见 route-analytics 的 onReady）。 */
export const activateAnalytics = (): void => {
  analyticsActive = true;
};

/** 统计是否已放行；测试用 `resetAnalyticsActivation` 复位。 */
export const isAnalyticsActive = (): boolean => analyticsActive;

/** 仅供测试：把开关复位到未启用状态。 */
export const resetAnalyticsActivation = (): void => {
  analyticsActive = false;
};
