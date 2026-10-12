import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type AnalyticsEnvironment } from "./analytics";
import { analyticsPathFor } from "./seo";
import {
  readSiteIdFromMeta,
  reportRouteChange,
  useRouteAnalytics,
} from "./route-analytics";

/** 只需要队列的替身：判定逻辑不碰 document/navigator。 */
const createEnvironment = () => {
  const environment: AnalyticsEnvironment = {
    document: {} as AnalyticsEnvironment["document"],
    navigator: { onLine: true },
    host: { addEventListener: () => {} },
  };
  return {
    environment,
    queue: () => environment.host._hmt ?? [],
  };
};

describe("reportRouteChange 补报判定", () => {
  it("首次渲染不补报（整页加载的 PV 由 hm.js 自己记）", () => {
    const env = createEnvironment();
    const previous = reportRouteChange(env.environment, null, "home", true);

    assert.equal(previous, "home");
    assert.deepEqual(env.queue(), []);
  });

  it("统计未就绪时不上报，也不推进已上报路由", () => {
    const env = createEnvironment();
    const previous = reportRouteChange(env.environment, "home", "video-frame", false);

    assert.equal(previous, "home", "未就绪时不应把新路由记为已上报");
    assert.deepEqual(env.queue(), []);
  });

  it("路由变化且已就绪时补报一次规范路径", () => {
    const env = createEnvironment();
    const previous = reportRouteChange(env.environment, "home", "image-watermark", true);

    assert.equal(previous, "image-watermark");
    assert.deepEqual(env.queue(), [
      ["_trackPageview", "/image-watermark/"],
    ]);
  });

  it("同一路由重复到达不重复上报", () => {
    const env = createEnvironment();
    const first = reportRouteChange(env.environment, "home", "video-compress", true);
    const second = reportRouteChange(env.environment, first, "video-compress", true);

    assert.equal(first, "video-compress");
    assert.equal(second, "video-compress");
    assert.equal(env.queue().length, 1, "同一次路由到达只应上报一次");
  });

  it("A→B→A 的往返各上报一次（路径按到达次数计）", () => {
    const env = createEnvironment();
    let reported = reportRouteChange(env.environment, "home", "image-compress", true);
    reported = reportRouteChange(env.environment, reported, "image-watermark", true);
    reported = reportRouteChange(env.environment, reported, "image-compress", true);

    assert.equal(reported, "image-compress");
    assert.deepEqual(env.queue(), [
      ["_trackPageview", "/image-compress/"],
      ["_trackPageview", "/image-watermark/"],
      ["_trackPageview", "/image-compress/"],
    ]);
  });

  it("无环境时不上报（服务端渲染与未挂载场景）", () => {
    const previous = reportRouteChange(null, "home", "video-frame", true);
    assert.equal(previous, "home");
  });

  it("补报路径等于 SEO_PAGES 的规范路径（含首页 /）", () => {
    const routes = [
      ["home", "/"],
      ["video-frame", "/video-frame/"],
      ["video-compress", "/video-compress/"],
      ["image-compress", "/image-compress/"],
      ["image-watermark", "/image-watermark/"],
      ["image-a4-layout", "/image-a4-layout/"],
    ] as const;

    for (const [route, path] of routes) {
      const env = createEnvironment();
      // 以其他路由作为历史值，确保这次到达会被判定为「变化」。
      const previous = route === "video-frame" ? "home" : "video-frame";
      reportRouteChange(env.environment, previous, route, true);
      assert.deepEqual(env.queue(), [["_trackPageview", path]], route);
    }
  });
});

describe("useRouteAnalytics 接线", () => {
  it("hook 可被引用且不依赖 DOM（effects 在浏览器外不执行）", () => {
    assert.equal(typeof useRouteAnalytics, "function");
  });

  it("注入环境替身时，纯判定逻辑不触碰浏览器全局", () => {
    const env = createEnvironment();
    reportRouteChange(env.environment, "home", "video-frame", true);
    assert.deepEqual(env.queue(), [["_trackPageview", "/video-frame/"]]);
  });

  it("readSiteIdFromMeta 读取注入的标识，缺失时返回空串", () => {
    const withMeta = (content: string | null) =>
      readSiteIdFromMeta({
        querySelector: () =>
          content === null
            ? null
            : ({ getAttribute: () => content } as unknown as Element),
      });

    assert.equal(
      withMeta("49b103455f3a286d39f1c63602f08f8a"),
      "49b103455f3a286d39f1c63602f08f8a",
    );
    assert.equal(withMeta("  spaced  "), "spaced");
    assert.equal(withMeta(null), "");
    assert.equal(withMeta(""), "");
  });
});

/**
 * PV 口径**语言无关**（6.5 / design 风险 6）。
 *
 * 语言进入 URL 后，若 PV 用 `window.location.pathname` 上报，既有 7 条工具路径的
 * 报表序列会被拆成 21 条。`reportRouteChange` 收的是 `ToolRoute`（已剥掉语言前缀
 * 的工具身份），因此语言不会进入 PV —— 这组断言把该性质钉住。
 */
describe("PV 口径语言无关", () => {
  it("同一工具在不同语言下上报同一条路径", () => {
    const reports = (["en", "zh-CN", "ja"] as const).map(() => {
      const env = createEnvironment();
      reportRouteChange(env.environment, "home", "video-compress", true);
      return env.queue();
    });

    // 三次调用的参数完全相同（语言根本不参与），因此上报必然一致
    for (const queue of reports) {
      assert.deepEqual(
        queue,
        [["_trackPageview", "/video-compress/"]],
        "PV 应上报语言无关的工具路径",
      );
    }
    assert.deepEqual(reports[0], reports[1]);
    assert.deepEqual(reports[1], reports[2]);
  });

  it("上报路径永不含语言前缀", () => {
    const env = createEnvironment();
    let reported: ReturnType<typeof reportRouteChange> = null;
    for (const route of [
      "home",
      "video-frame",
      "video-compress",
      "image-compress",
      "image-watermark",
      "id-photo",
      "image-a4-layout",
    ] as const) {
      reported = reportRouteChange(env.environment, reported, route, true);
    }
    for (const entry of env.queue() as Array<[string, string]>) {
      const path = entry[1];
      assert.ok(!path.startsWith("/zh/"), `不应出现 /zh 前缀：${path}`);
      assert.ok(!path.startsWith("/ja/"), `不应出现 /ja 前缀：${path}`);
      assert.ok(!path.startsWith("/en/"), `不应出现 /en 前缀：${path}`);
    }
    assert.equal((env.queue() as unknown[]).length, 6, "七个工具应上报六次（首页不计）");
  });

  it("analyticsPathFor 与语言无关，等于默认语言的工具路径", () => {
    for (const route of [
      "home",
      "video-frame",
      "video-compress",
      "image-compress",
      "image-watermark",
      "id-photo",
      "image-a4-layout",
    ] as const) {
      const path = analyticsPathFor(route);
      assert.ok(!path.startsWith("/zh/") && !path.startsWith("/ja/"), path);
    }
  });
});
