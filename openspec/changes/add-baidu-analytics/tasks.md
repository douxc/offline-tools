## 1. 统计模块与构建期标识

- [x] 1.1 新增 `src/lib/analytics.ts`：导出统计端点常量（`hm.baidu.com/hm.js`）、内置站点标识 `49b103455f3a286d39f1c63602f08f8a`、构建期占位符常量，以及 `resolveAnalyticsId()`（`VITE_ANALYTICS_ID` 优先、空字符串表示关闭、否则回退默认值），验证方式为 `src/lib/analytics.test.ts` 断言三种输入分支的返回值。
- [x] 1.2 在 `src/lib/analytics.ts` 中实现 `loadAnalytics()` 加载门：非生产构建返回、标识为空返回、`navigator.onLine === false` 时注册 `online` 监听后返回、否则在 `requestIdleCallback`（缺失时 `setTimeout` 兜底）里创建 `async` 脚本标签并预先建好 `window._hmt` 队列；签名允许注入 `window`/`navigator` 以便测试，验证方式为单元测试覆盖「未在线不插标签」「恢复在线后插一次且脚本标签数为 1」。
- [x] 1.3 在 `src/lib/analytics.ts` 中实现 `pushAnalyticsCommand()`：`_hmt` 队列缺失时自建、入队长度超过上限后停止入队且不抛错，验证方式为单元测试断言超限后队列长度不再增长且调用不抛异常。
- [x] 1.4 在 `src/lib/analytics.ts` 中实现 `reportRouteView(route)`，取 `SEO_PAGES[route].path` 调 `_trackPageview`，验证方式为单元测试断言 6 个路由的上报路径均以 `/` 开头且与 `SEO_PAGES[route].path` 相等（含首页 `/`）。
- [x] 1.5 在 `src/lib/analytics.ts` 中定义固定事件枚举（类别 `video-frame`/`video-compress`/`image-compress`/`image-watermark`/`image-a4-layout`，动作 `export-frame`/`export-batch`/`compress`/`process`/`print`/`cancel`，结果 `success`/`partial`/`failed`）与 `trackToolEvent(category, action, label, value?)`，验证方式为单元测试断言枚举取值集合稳定、且 `_trackEvent` 队列项的第二个参数只能是枚举内的类别、第三个参数只能是枚举内的动作。
- [x] 1.6 在 `vite.config.ts` 的站点 URL 插件中同时完成站点标识注入（`transformIndexHtml` 为主、`closeBundle` 兜底，保持「先注入、后算预缓存修订号」的顺序），验证方式为 `pnpm build` 后 `dist/index.html` 含真实标识且不含占位符、`dist/sw.js` 中该 HTML 的预缓存修订号与产物内容一致。

## 2. 上报接入点

- [x] 2.1 新增 `src/lib/tool-analytics.ts`：为视频取帧（单帧导出成功/失败、批量导出成功带帧数与格式、批量失败、批量取消）、视频压缩（完成带输出字节数与码率档、失败）、图片压缩与图片水印（完成带张数、部分失败、全部失败、取消）、A4 排版（打印带每行张数）提供语义助手函数，验证方式为 `src/lib/tool-analytics.test.ts` 断言助手产出的队列项参数逐项匹配既定口径，且取消走 `cancel` 动作而非 `failed`。
- [x] 2.2 在 `src/OfflineToolsApp.tsx` 挂载时调用一次 `loadAnalytics()`，并在 `route` 变化时调用 `reportRouteView(route)`，首帧不上报，验证方式为组件测试：渲染后立即断言无 PV 队列项，`popstate`/路由切换后断言恰好一条 PV 且路径为新路由的规范路径。
- [x] 2.3 在 `src/App.tsx` 的单帧导出成功与失败分支、批量抽帧导出成功分支（带 `times.length` 与 `format`）、批量失败分支、批量取消分支接入对应语义助手，验证方式为 `src/App.test.tsx` 中相关用例断言成功/失败/取消三类上报不互相混淆。
- [x] 2.4 在 `src/components/video-compressor.tsx` 的压缩完成分支（带输出字节数与 `bitrateLevel`）与各失败分支接入语义助手，验证方式为 `src/components/video-compressor.test.tsx` 断言完成上报含字节数、失败上报不产生成功事件。
- [x] 2.5 在 `src/tools/image-processor/ImageProcessor.tsx` 的批量处理完成分支按「全部成功 / 部分失败 / 全部失败 / 取消」四种结果接入语义助手（带总张数与 `mode`），验证方式为对应组件测试断言四种结果分别产出 `success`/`partial`/`failed`/`cancel` 事件。
- [x] 2.6 在 `src/tools/image-a4-layout/A4ImageLayout.tsx` 的 `handlePrint` 中接入打印事件（带 `colsPerRow`），验证方式为 `A4ImageLayout.test.tsx` 断言调用打印上报一次、未导入图片时的空操作不上报。

## 3. 披露与打印隔离

- [x] 3.1 在 `src/components/license-footer.tsx` 增加统计说明（说明使用百度统计做页面访问统计、文件仍只在本机处理），验证方式为 `src/components/license-footer.test.tsx` 断言页脚同时含「本地处理 · 不上传文件」声明与统计说明、且两个许可链接仍在。
- [x] 3.2 在 `src/index.css` 的 `@media print` 隐藏列表中加入 `.license-footer`（现状遗漏，会导致统计说明与许可声明被印到 A4 纸上），验证方式为 `tests/build-output.test.mjs` 或新增打印契约断言：`@media print` 块内的隐藏选择器包含 `.license-footer`。

## 4. 产物契约与回归测试

- [x] 4.1 新增 `tests/analytics-embed.test.mjs`：断言 6 个 HTML 入口含统计标识与统计端点、不含未替换占位符，且 `dist/sw.js` 与预缓存清单中不出现 `hm.baidu.com` 或 `hm.js`；接入 `package.json` 的 `test` 脚本并确认 `pnpm test` 通过。
- [x] 4.2 修订 `tests/site-url-embed.test.mjs`：在「站点地址产物的 host 唯一」断言中显式放行 `hm.baidu.com`（与既有 `schema.org`/`www.sitemaps.org` 白名单同处），并新增「除白名单外无其他第三方 host」的否定断言，验证方式为 `pnpm test` 中该文件全绿。
- [x] 4.3 在 `tests/build-output.test.mjs` 的六个入口断言中补充统计标识存在性断言，验证方式为 `pnpm test` 通过。
- [x] 4.4 运行 `pnpm test` 与 `pnpm lint` 全绿，确认 `tests/theme-script-embed.test.mjs`、`tests/stable-anchors-embed.test.mjs`、`tests/contrast-embed.test.mjs` 等既有契约测试未因新增调用点而失效。

## 5. 文档与上线核对

- [x] 5.1 在 `project-map.md` 补充统计接入段（统计通道、标识单一来源、加载门、事件口径、不上报清单），并核对 `README.md` 与页面文案中「不上传」的表述在新披露下不产生歧义，验证方式为人工复查两份文档与页脚文案一致。
- [x] 5.2 本地验证不加载：`pnpm dev` 打开任一入口，确认 Network 中无 `hm.baidu.com` 请求、控制台无统计相关报错，验证方式为人工核对（可留证截图或 Network 导出）。
- [ ] 5.3 生产构建与部署验证：`pnpm build` 后检查 `dist/index.html` 的标识、部署到生产后在浏览器 Network 确认 `hm.js` 与上报请求出现、切换工具页时收到新路径 PV。**本地部分已完成**：`dist/index.html` 的统计标识为 `49b103455f3a286d39f1c63602f08f8a`、无残留占位符、`dist/sw.js` 不含统计端点，且 `index.html` 的预缓存修订号与产物 md5 一致（`455a52506486d737267798430ddbb058`）；**待线上核对**：部署后 `hm.js` 与上报请求出现、切换工具页收到新路径 PV。
- [ ] 5.4 百度统计后台核对（上线后人工跟进，需站点管理员在部署后执行）：实时访客可见、受访页面出现 6 条规范路径、事件跟踪出现工具完成/失败/取消事件，并确认**未**开启「单页应用数据统计」开关（开启会与前端 `_trackPageview` 重复上报）。
