## Context

站点是 6 个真实 HTML 入口 + 同一份客户端 bundle 的多入口应用（见 `project-map.md` 的「架构」「路由」）：入口之间靠 `history.pushState` 无刷新切换，`SEO_PAGES` 已是「路由 → 规范路径」的唯一来源，`ToolRoute` 是所有路由判定的类型。统计要覆盖的正是这套切换，因为整页加载只发生在首次进入某个入口时。

三条既有约束决定了实现形态：

1. **站点可离线使用**：`vite-plugin-pwa` 以 `registerType: "prompt"` 注册 Service Worker，`globPatterns` 只覆盖同源产物。统计脚本是跨域资源，既不该进预缓存，也不该让离线提示依赖它。
2. **「不上传文件」是对外承诺**：文案与页脚都在强调本地处理，接入第三方统计必须给出边界与披露，否则表述失真。
3. **构建期注入已有成熟模式**：`vite.config.ts` 的站点 URL 插件用 `__SITE_URL__` 占位符做 `transformIndexHtml` + `closeBundle` 两层注入，并由 `tests/site-url-embed.test.mjs` 守住「先注入、后算预缓存修订号」的顺序。统计标识沿用同一套路可复用既有机制与测试形态。

百度统计的接入细节以官方文档为准：`_trackPageview` 只接受以 `/` 开头的相对路径，且用它标记的路径不能充当转化路径的入口/中间页（[trackPageview 说明](https://tongji.baidu.com/web/help/article?from_query=_trackPageview&id=235&index=0&type=0)）；`_trackEvent` 的参数多样性乘积上限为 10000（[trackEvent 说明](https://tongji.baidu.com/web/help/article?id=236)）；后台另有一个「启用单页应用数据统计」开关，开启后由 hm.js 自动发 PV，且**必须移除**自行的 `_trackPageview` 以免重复（[单页应用设置](https://tongji.baidu.com/web/help/article?id=324)）。

## Goals / Non-Goals

**Goals:**

- 用一个模块承载「标识 + 加载门 + 上报口径」，使统计的可变部分（站点标识、加载条件）集中且可被测试直接调用。
- 让统计在开发、离线、脚本被拦截三种情况下都退化为「什么都不发生」，且这一退化可被自动化测试证明。
- 让事件口径固定到可枚举，使百度统计后台的「事件跟踪」报表能直接回答「哪个工具被真正用完」。

**Non-Goals:**

- 不做用户同意门、不做统计开关 UI、不做 Do Not Track 判定（用户已明确选择「只在生产且在线时加载」的姿态）。
- 不做离线补报/队列持久化：百度统计本身不支持补报，用 `localStorage` 存队列会把标识类数据写到本地，与「不写入浏览器存储」冲突。
- 不引入任何 npm 依赖（统计脚本由百度 CDN 提供）。
- 不改动任何文件处理、导出、打印逻辑；不采集文件内容、文件名或本地处理结果。

## Decisions

### 决策 1：站点标识放在 `src/lib/analytics.ts`，构建期以 `VITE_ANALYTICS_ID` 覆盖

新增模块导出内置默认标识（`49b103455f3a286d39f1c63602f08f8a`）与 `resolveAnalyticsId()`：环境变量 `VITE_ANALYTICS_ID?.trim()` 优先，空字符串**显式表示关闭统计**（构建时剔除全部统计代码路径，`import.meta.env.PROD` 之外同理），否则回退内置默认值。构建期把解析结果注入 HTML 的 `__ANALYTICS_ID__` 占位符，与 `SITE_URL_TOKEN` 同层同一插件完成，从而复用「先注入、后算预缓存修订号」的既有顺序保证。

*为什么不用纯运行时常量*：`tests` 的产物断言与运维排查都需要「产物里到底用了哪个标识」可被读出，占位符注入让 HTML 自身携带答案，也使「关闭统计」表现为产物中不出现该标识，而不是运行时的空判断。

*备选（被否）*：把标识写进 `vite.config.ts` 的环境变量、客户端用 `import.meta.env` 读取。生产环境变量由 EdgeOne 云端构建提供，仓库内就没有默认值，本地生产构建会产出无标识的产物，与「换统计站点只改一处」的单一来源目标相悖。

### 决策 2：加载门 = 生产构建 + `navigator.onLine`，在浏览器空闲时插入脚本

`loadAnalytics()` 的判定顺序：非 `import.meta.env.PROD` → 直接返回；标识为空 → 直接返回；`navigator.onLine === false` → 注册 `online` 监听后返回（首次联网时再尝试一次），且**不重放离线期间的动作**；否则在 `requestIdleCallback`（无该 API 时退回 `setTimeout(…, 0)`）里创建 `async` script 标签，并把 `window._hmt = window._hmt || []` 队列先建好。

*为什么用 `requestIdleCallback`*：hm.js 是跨域大脚本，首屏与工具可用时间不能被它争抢；排队到空闲再插入可与 `PwaStatus` 的 SW 注册错开。

*为什么用 `_hmt` 队列而不是「等脚本 onload 再上报」*：官方接入代码本身就是先建数组、由 hm.js 加载后自行消费。这样即使脚本被拦截，队列只是原地增长、不抛错、不产生未处理的 Promise 拒绝，天然满足「静默降级」。队列长度设一个上限（超过后停止入队）以避免极端情况下的内存增长。

### 决策 3：PV 路径复用 `SEO_PAGES[route].path`，不新增路径来源

`reportRouteView(route)` 取 `SEO_PAGES[route].path` 上报（首页为 `/`，工具页形如 `/image-watermark/`）。这同时满足两条要求：路径以 `/` 开头（`_trackPageview` 的硬约束），且与页面 canonical 严格一致 —— 百度统计的「受访页面」因此能与站点的规范 URL 直接对齐。`src/lib/seo.test.ts` 已断言 `SEO_PAGES[route].path === TOOL_PATHS[route]`，统计路径的一致性由既有测试链传递保证。

**不上报时机**：首次渲染不上报。入口 HTML 的整页加载已由 hm.js 自动记一次 PV，若 SSR 首帧也补发就会把每个入口的 PV 翻倍。实现上把「已知路由」的初始值记在 ref 中，只有 `route` 真正变化时才上报 —— 这一点由单元测试直接覆盖（见任务 3）。

*备选（被否）*：使用官方 `UrlChangeTracker` 插件。它会自动监听 History API，但接管时机与「加载门」解耦（脚本被拦截后队列里的插件调用永不生效），且无法在单测里断言「首次不重复上报」。手写一处 10 行的 effect 更可测。

### 决策 4：事件口径固定枚举，语义助手收敛翻译

`src/lib/analytics.ts` 定义固定枚举：类别 `video-frame` / `video-compress` / `image-compress` / `image-watermark` / `image-a4-layout`；动作 `export-frame` / `export-batch` / `compress` / `process` / `print` / `cancel`；结果 `success` / `partial` / `failed`。标签只留在事件回调的 `label` 位；数值只承载张数、帧数、字节数、每行张数等无用户语义的计数。

`src/lib/tool-analytics.ts` 提供语义助手（如 `trackFrameBatchExported(frames)`、`trackImageProcessingFinished({ total, failed, cancelled })`），把「失败 / 部分失败 / 取消」的判定收敛在一处，使取消不会被记成失败。

*多样性核算*：类别 5 × 动作 6 × 标签取值（格式 3 种、抽样方式 3 种、码率预设 4 种、每行张数 6 种）≈ 数百种组合，远低于百度统计 10000 的上限。

*为什么用工具语义助手而不是在调用点直接拼 `_hmt.push`*：调用点分散在 5 个组件里，直接拼字符串会让「类别/动作拼错」这类缺陷只能靠人工审查发现；助手使拼装结果可以被单测逐项断言。

### 决策 5：上报点挂在既有完成/失败节点，不新增状态

调用点选择已存在的状态转换位置，避免为了埋点引入新状态或重复判断：

| 位置 | 节点 |
| --- | --- |
| `src/App.tsx` | 单帧导出成功 / 失败；批量抽帧导出成功（帧数）/ 失败 / 取消（`toast.info` 分支） |
| `src/components/video-compressor.tsx` | 压缩完成（输出字节数）/ 失败 |
| `src/tools/image-processor/ImageProcessor.tsx` | 批量处理完成（张数）/ 部分失败 / 全部失败 / 取消 |
| `src/tools/image-a4-layout/A4ImageLayout.tsx` | 调用打印（每行张数、页数） |
| `src/OfflineToolsApp.tsx` | 路由变化（PV） |

### 决策 6：PWA 不缓存统计脚本，靠显式断言而不是默认行为

`workbox.globPatterns` 只匹配同源产物，跨域脚本本就不在预缓存范围内；同时不配置任何 `runtimeCaching` 规则。为防将来有人加了一条宽泛的运行时缓存把统计脚本卷进来，新增产物断言：`dist/sw.js` 与本地产物中不出现 `hm.baidu.com`，`manifest` 与预缓存清单不含 `hm.js`。

### 决策 7：披露落在许可页脚，并顺带修正打印隐藏列表

统计说明加进 `LicenseFooter`（与「本地处理 · 不上传文件」并列），文案说明「使用百度统计做页面访问统计，文件仍只在本机处理」。

**发现并需修正的既有缺陷**：`src/index.css` 的 `@media print` 隐藏列表包含 `.icp-footer` 与 `.pwa-status`，但**不含 `.license-footer`**，而 `site-content` 的「打印时隐藏」场景要求打印输出不含许可页脚。此前未暴露是因为 A4 页有内容遮住后续流；既然本变更要往该页脚加内容，此处必须一并把 `.license-footer` 加进隐藏列表，否则统计说明会真的印到纸上。

## Risks / Trade-offs

- **后台「单页应用数据统计」开关与前端上报重复** → 前端显式走 `_trackPageview`，后台开关保持关闭；这条写成上线后的人工核对项（任务 10），并在设计文档与任务里都点明「开启开关必须移除前端上报」。
- **上报路径若被改成 hash 或绝对地址** → `_trackPageview` 对相对路径是硬约束，绝对地址会被丢弃且报表出现残缺条目；用单元测试断言所有路由的路径都以 `/` 开头且等于 `SEO_PAGES[route].path`。
- **`_hmt` 队列在脚本被拦截时无界增长** → 入队前检查队列长度上限，超限后丢弃并停止入队（不记录、不重试）。
- **统计请求暴露「有访客」这一事实与「不上传」表述的张力** → 页脚披露 + 不采集文件名/内容 + 不写浏览器存储，把边界写进 `analytics` 规格；对外表述保持「文件不上传」的原意不变。
- **`navigator.onLine` 在部分环境不可靠（例如局域网连通但无外网）** → 判定只作为「不发起明显无效请求」的乐观门，脚本加载失败仍由 `_hmt` 队列 + 无 onerror 处理静默承接，不引入重试。
- **新增第三方 host 会让既有产物契约测试失败** → `tests/site-url-embed.test.mjs` 的「host 唯一」断言需按既有约定（`schema.org`、`www.sitemaps.org` 白名单）显式放行 `hm.baidu.com`，并新增否定断言禁止其他第三方 host 回流。这是本变更唯一需要改动的既有测试语义，改动范围在任务清单中显式列出。

## Migration Plan

1. 实现 + 本地验证：`pnpm dev` 下确认无统计请求；`pnpm test` 全绿（含新增产物断言）。
2. 生产构建验证：`pnpm build` 后检查 `dist/index.html` 含正确标识、`dist/sw.js` 不含统计端点。
3. 部署到生产（push main → EdgeOne 云端构建），在浏览器 Network 里确认 `hm.js` 与上报请求出现，并在切换工具页时确认收到新路径的 PV。
4. 在百度统计后台核对：实时访客可见、受访页面出现 6 条规范路径、事件跟踪出现工具事件；确认**未**开启「单页应用数据统计」开关。
5. 回滚：把 `VITE_ANALYTICS_ID` 置空后重新构建部署即可完全关闭统计（产物不含标识、不加载脚本）；代码层面移除统计调用不影响任何工具功能。

## Open Questions

- 是否需要给站点补一个独立的隐私说明页（当前只做页脚一句披露）。属于后续增量，不改变本变更的规格、方案与任务拆分。
- 是否需要 DNT（Do Not Track）判定。若将来要加，只是 `loadAnalytics()` 里多一个前置条件，不触及规格与任务结构。
