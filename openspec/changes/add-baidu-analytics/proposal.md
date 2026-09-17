## Why

站点已备案上线并在生产域名 `https://offline-tools.colors-cc.top/` 对外服务，但没有任何访问统计：不知道该来的流量落在哪个工具页、哪个工具真正被用完（导出成功）而不是只被打开。百度统计（[tongji.baidu.com](https://tongji.baidu.com)）是国内合规部署下最直接的选择，站点已具备 ICP 备案，接入它不需要新增后端。

难点在于站点既有对外承诺是「文件只在本机处理，无需上传或注册」且可离线使用（PWA）。第三方统计脚本意味着页面会向 `hm.baidu.com` 发请求，这既可能与「不上传」的表述产生歧义，也与离线可用性存在冲突，因此接入必须同时给出边界（何时加载、何时不上报、披露在哪），而不是直接贴一段官方代码。

## What Changes

- 新增站点统计能力：以百度统计 `hm.js` 为唯一统计通道，站点 ID `49b103455f3a286d39f1c63602f08f8a` 与加载条件收敛到单一来源模块（构建期环境变量可覆盖，模式与既有 `src/lib/site.ts` 一致）。
- 加载条件为「生产构建 + 浏览器在线」：本地开发、`vite preview` 之外的 dev 场景与离线打开都不加载脚本、不产生任何外部请求；离线不排队、不补报。
- 统计脚本不进入 PWA 预缓存（离线可用性不被第三方脚本拖累），加载失败（广告拦截、CSP、网络中断）静默降级，不影响任何工具功能。
- 路由级 PV 上报：6 个入口首次加载由 `hm.js` 自动上报，客户端 `history.pushState` 切换路由时补发一次 `_trackPageview`，路径取自既有 `SEO_PAGES`（`analytics` 不新增路径定义）。
- 关键工具行为事件上报：以固定枚举的 `_trackEvent`（category/action/label）覆盖视频取帧、批量抽帧导出、视频压缩、图片压缩、图片水印、A4 排版、打印的「完成/失败/取消」，使数据能回答「哪个工具被真正用完」。
- 对外披露：许可页脚增加一句统计说明（沿用既有「本地处理 · 不上传文件」声明所在组件），使「不上传」的表述在存在统计请求时不产生歧义。
- 新增产物契约测试：断言产物含站点 ID、hm.js 只在生产构建出现、脚本不被预缓存、且 `_hmt` 队列调用不早于加载判断。

## Capabilities

### New Capabilities

- `analytics`: 站点访问统计的接入契约——百度统计作为唯一统计通道、站点 ID 的单一来源与构建期覆盖、加载的生产与在线前置条件、路由级 PV 与关键工具行为事件的固定上报口径、离线与非生产环境的不加载不缓存、加载失败的静默降级，以及对外披露位置。

### Modified Capabilities

- `site-content`: 「许可页脚统一」要求扩展——页脚除既有 GPL 声明与两个许可链接外，SHALL 包含统计说明（第三方统计的存在与用途），且该说明在打印输出中同样不出现。

## Impact

- 新增源码：`src/lib/analytics.ts`（站点 ID 单一来源、加载器、`_trackPageview`/`_trackEvent` 封装与事件口径）、`src/lib/tool-analytics.ts`（工具语义事件助手）、`src/lib/analytics.test.ts`。
- 修改源码：`src/lib/seo.ts`（复用既有路径映射，不新增来源）、`src/OfflineToolsApp.tsx`（路由变更时上报 PV）、`src/App.tsx`（单帧导出、批量抽帧导出/失败/取消）、`src/components/video-compressor.tsx`（压缩完成/失败）、`src/tools/image-processor/ImageProcessor.tsx`（批量处理完成/部分失败/取消）、`src/tools/image-a4-layout/A4ImageLayout.tsx`（打印）、`src/components/license-footer.tsx`（统计说明）。
- 构建：`vite.config.ts` 增加站点 ID 的构建期解析与注入（可复用站点 URL 插件的注入机制与占位符分层）。**不新增 npm 依赖**、不改动任何文件处理逻辑、不上传任何用户文件内容。
- 测试：新增统计产物契约测试接入 `package.json` 的 `test` 脚本；`tests/build-output.test.mjs` 与 `tests/site-url-embed.test.mjs` 需容忍产物中新增的第三方 host（`hm.baidu.com`）——后者当前断言「站点地址产物中绝对 URL host 唯一」，统计脚本地址不属于站点自身地址，需按既有约定（如 `schema.org` 白名单）显式放行。
- 文档：`project-map.md` 补统计接入段、`README.md` 的隐私表述核对。
- 上线后人工跟进（不属于代码改动）：在百度统计后台确认站点 ID 归属与「受访页面」报告是否出现 6 条路径；如开启后台「单页应用数据统计」开关会与本次的前端 `_trackPageview` 重复上报，必须保持关闭。
