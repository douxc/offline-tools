import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type AnalyticsEnvironment } from "./analytics";
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
