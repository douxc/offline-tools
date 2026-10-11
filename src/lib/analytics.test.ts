import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activateAnalytics,
  ANALYTICS_ACTIONS,
  ANALYTICS_CATEGORIES,
  ANALYTICS_QUEUE_LIMIT,
  ANALYTICS_RESULTS,
  ANALYTICS_SCRIPT_HOST,
  ANALYTICS_SCRIPT_URL,
  DEFAULT_ANALYTICS_ID,
  isAnalyticsActive,
  loadAnalytics,
  pushAnalyticsCommand,
  resetAnalyticsActivation,
  resolveAnalyticsId,
  trackAnalyticsEvent,
  trackRouteView,
  type AnalyticsCommand,
  type AnalyticsEnvironment,
} from "./analytics";
import { SEO_PAGES } from "./seo";
import { TOOL_PATHS, type ToolRoute } from "./tool-navigation";

const TOOL_ROUTES: ToolRoute[] = [
  "home",
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "image-a4-layout",
];

const PRODUCTION = { isProduction: true, siteId: DEFAULT_ANALYTICS_ID };

type TestScriptElement = ReturnType<
  AnalyticsEnvironment["document"]["createElement"]
> & {
  src: string;
  async: boolean;
  readonly dataset: Record<string, string>;
};

/** 可注入的浏览器替身：document/navigator/host 全部可控，且记录插入了哪些脚本。 */
const createEnvironment = ({
  online = true,
  scheduling = "idle",
}: { online?: boolean; scheduling?: "idle" | "timeout" } = {}) => {
  const inserted: TestScriptElement[] = [];
  const listeners = new Map<string, Array<() => void>>();
  const pendingIdle: Array<() => void> = [];
  const pendingTimers: Array<() => void> = [];
  const timerDelays: number[] = [];

  const matches = (
    element: { dataset: Record<string, string> },
    selector: string,
  ) => {
    const value = /data-analytics="([^"]+)"/.exec(selector)?.[1];
    return value !== undefined && element.dataset.analytics === value;
  };

  const environment: AnalyticsEnvironment = {
    document: {
      createElement: () => {
        const dataset: Record<string, string> = {};
        return {
          // 真实 DOM 只允许修改字段，不能整体替换 dataset。
          get dataset() {
            return dataset;
          },
          src: "",
          async: false,
          appendChild: (element) => element,
          getAttribute: (name) =>
            name === "data-analytics" ? dataset.analytics ?? null : null,
        };
      },
      head: {
        appendChild: (element) => {
          inserted.push(element as TestScriptElement);
          return element;
        },
        getAttribute: () => null,
      },
      querySelector: (selector) =>
        inserted.find((element) => matches(element, selector)) ?? null,
    },
    navigator: { onLine: online },
    host: {
      addEventListener: (type, listener) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
    },
    requestIdleCallback:
      scheduling === "idle"
        ? (callback) => {
            pendingIdle.push(callback);
          }
        : undefined,
    setTimeout: (callback, delay) => {
      pendingTimers.push(callback);
      timerDelays.push(delay);
    },
  };

  return {
    environment,
    inserted,
    /** 触发空闲回调（对应插标签的时机）。 */
    flushIdle: () => {
      for (const callback of pendingIdle.splice(0)) callback();
    },
    flushTimers: () => {
      for (const callback of pendingTimers.splice(0)) callback();
    },
    timerDelays,
    /** 模拟恢复在线。 */
    goOnline: () => {
      environment.navigator.onLine = true;
      for (const listener of listeners.get("online") ?? []) listener();
    },
    queue: () => (environment.host._hmt ?? []) as AnalyticsCommand[],
  };
};

describe("resolveAnalyticsId", () => {
  it("未提供覆盖时回退内置标识，空值显式关闭统计", () => {
    assert.equal(resolveAnalyticsId(), DEFAULT_ANALYTICS_ID);
    assert.equal(resolveAnalyticsId(undefined), DEFAULT_ANALYTICS_ID);
    assert.equal(resolveAnalyticsId(""), "");
    assert.equal(resolveAnalyticsId("   "), "");
    assert.equal(resolveAnalyticsId("  abc123  "), "abc123");
  });

  it("内置标识与统计端点固定", () => {
    assert.equal(ANALYTICS_SCRIPT_HOST, "hm.baidu.com");
    assert.equal(ANALYTICS_SCRIPT_URL, "https://hm.baidu.com/hm.js");
  });
});

describe("loadAnalytics 加载门", () => {
  it("非生产构建不加载", () => {
    const env = createEnvironment();
    loadAnalytics(env.environment, {
      isProduction: false,
      siteId: DEFAULT_ANALYTICS_ID,
    });
    env.flushIdle();
    assert.deepEqual(env.inserted, []);
    assert.equal(env.environment.host._hmt, undefined, "开发环境不应建队列");
  });

  it("标识为空（显式关闭统计）不加载", () => {
    const env = createEnvironment();
    loadAnalytics(env.environment, { isProduction: true, siteId: "" });
    env.flushIdle();
    assert.deepEqual(env.inserted, []);
  });

  it("生产构建在线时插入一次统计脚本，重复调用不重复插入", () => {
    const env = createEnvironment();
    loadAnalytics(env.environment, PRODUCTION);
    loadAnalytics(env.environment, PRODUCTION);
    assert.doesNotThrow(() => env.flushIdle());

    assert.equal(env.inserted.length, 1);
    assert.equal(
      env.inserted[0].src,
      `${ANALYTICS_SCRIPT_URL}?${DEFAULT_ANALYTICS_ID}`,
    );
    assert.equal(env.inserted[0].dataset.analytics, ANALYTICS_SCRIPT_HOST);
    assert.equal(env.inserted[0].async, true);
  });

  it("离线时不插标签，恢复在线后只插一次", () => {
    const env = createEnvironment({ online: false });
    loadAnalytics(env.environment, PRODUCTION);
    env.flushIdle();
    assert.deepEqual(env.inserted, []);

    env.goOnline();
    env.flushIdle();
    assert.equal(env.inserted.length, 1);

    env.goOnline();
    env.flushIdle();
    assert.equal(env.inserted.length, 1, "恢复在线只应补插一次");
  });

  it("缺少空闲回调时通过计时器加载，且重复调用只插入一次", () => {
    const env = createEnvironment({ scheduling: "timeout" });
    loadAnalytics(env.environment, PRODUCTION);
    loadAnalytics(env.environment, PRODUCTION);
    assert.deepEqual(env.inserted, [], "计时器执行前不插入脚本");
    assert.deepEqual(env.timerDelays, [0, 0]);
    assert.doesNotThrow(() => env.flushTimers());

    assert.equal(env.inserted.length, 1);
    assert.equal(env.inserted[0].async, true);
    assert.equal(env.inserted[0].dataset.analytics, ANALYTICS_SCRIPT_HOST);
    assert.equal(
      env.inserted[0].src,
      `${ANALYTICS_SCRIPT_URL}?${DEFAULT_ANALYTICS_ID}`,
    );
  });

  it("计时器回退同样遵守开发、关闭统计和离线恢复的加载条件", () => {
    for (const options of [
      { ...PRODUCTION, isProduction: false },
      { ...PRODUCTION, siteId: "" },
    ]) {
      const env = createEnvironment({ scheduling: "timeout" });
      loadAnalytics(env.environment, options);
      env.flushTimers();
      assert.deepEqual(env.timerDelays, []);
      assert.deepEqual(env.inserted, []);
    }

    const offline = createEnvironment({ online: false, scheduling: "timeout" });
    loadAnalytics(offline.environment, PRODUCTION);
    offline.flushTimers();
    assert.deepEqual(offline.timerDelays, []);
    assert.deepEqual(offline.inserted, []);

    offline.goOnline();
    assert.deepEqual(offline.inserted, []);
    assert.doesNotThrow(() => offline.flushTimers());
    assert.equal(offline.inserted.length, 1);
    offline.goOnline();
    offline.flushTimers();
    assert.equal(offline.inserted.length, 1);
    assert.deepEqual(offline.timerDelays, [0]);
  });

  it("统计放行时机：只有加载门通过后才放行（离线期间保持关闭）", () => {
    resetAnalyticsActivation();
    const offline = createEnvironment({ online: false });
    let activated = 0;
    loadAnalytics(offline.environment, {
      ...PRODUCTION,
      onReady: () => {
        activated += 1;
        activateAnalytics();
      },
    });
    assert.equal(isAnalyticsActive(), false, "离线时不得放行工具事件");
    assert.equal(activated, 0);

    offline.goOnline();
    assert.equal(isAnalyticsActive(), true, "恢复在线并插入脚本后放行");
    assert.equal(activated, 1);

    resetAnalyticsActivation();
    const dev = createEnvironment();
    loadAnalytics(dev.environment, {
      isProduction: false,
      siteId: DEFAULT_ANALYTICS_ID,
      onReady: () => activateAnalytics(),
    });
    assert.equal(isAnalyticsActive(), false, "开发环境不得放行");

    const disabled = createEnvironment();
    loadAnalytics(disabled.environment, {
      isProduction: true,
      siteId: "",
      onReady: () => activateAnalytics(),
    });
    assert.equal(isAnalyticsActive(), false, "关闭统计时不得放行");
    resetAnalyticsActivation();
  });
});

describe("pushAnalyticsCommand 队列上限", () => {
  it("超限后停止入队且不抛错", () => {
    const env = createEnvironment();
    for (let index = 0; index < ANALYTICS_QUEUE_LIMIT + 10; index += 1) {
      assert.doesNotThrow(() =>
        pushAnalyticsCommand(env.environment, ["_trackEvent", "video-frame", "success"]),
      );
    }
    assert.equal(env.queue().length, ANALYTICS_QUEUE_LIMIT);
  });
});

describe("trackRouteView 上报路径", () => {
  it("六个路由的上报路径都等于规范路径且以 / 开头", () => {
    for (const route of TOOL_ROUTES) {
      const env = createEnvironment();
      trackRouteView(env.environment, SEO_PAGES[route].path);
      const [command, path] = env.queue()[0] as [string, string];

      assert.equal(command, "_trackPageview", `${route} 命令`);
      assert.equal(path, SEO_PAGES[route].path, `${route} 路径`);
      assert.equal(path, TOOL_PATHS[route], `${route} 与 TOOL_PATHS 一致`);
      assert.ok(path.startsWith("/"), `${route} 路径必须以 / 开头`);
    }
    assert.equal(SEO_PAGES.home.path, "/");
  });

  it("非相对路径被丢弃（百度统计只接受 / 开头的相对路径）", () => {
    const env = createEnvironment();
    trackRouteView(env.environment, "https://example.com/video-frame/");
    trackRouteView(env.environment, "#/video-frame/");
    assert.deepEqual(env.queue(), []);
  });
});

describe("trackAnalyticsEvent 事件口径", () => {
  it("枚举取值固定", () => {
    assert.deepEqual(
      [...ANALYTICS_CATEGORIES],
      [
        "video-frame",
        "video-compress",
        "image-compress",
        "image-watermark",
        "image-a4-layout",
      ],
    );
    assert.deepEqual(
      [...ANALYTICS_ACTIONS],
      ["export-frame", "export-batch", "compress", "process", "print", "cancel"],
    );
    assert.deepEqual([...ANALYTICS_RESULTS], ["success", "partial", "failed"]);
  });

  it("产出的队列项只含枚举内的类别与动作，可带标签与数值", () => {
    const env = createEnvironment();
    trackAnalyticsEvent(env.environment, "video-frame", "export-batch", "png", 12);
    trackAnalyticsEvent(env.environment, "image-a4-layout", "print");

    const [withValue, withoutValue] = env.queue();
    assert.deepEqual(withValue, ["_trackEvent", "video-frame", "export-batch", "png", 12]);
    assert.deepEqual(withoutValue, ["_trackEvent", "image-a4-layout", "print"]);

    for (const command of env.queue()) {
      assert.ok(
        ANALYTICS_CATEGORIES.includes(command[1] as never),
        `类别必须是枚举取值：${String(command[1])}`,
      );
      assert.ok(
        ANALYTICS_ACTIONS.includes(command[2] as never),
        `动作必须是枚举取值：${String(command[2])}`,
      );
    }
  });
});
