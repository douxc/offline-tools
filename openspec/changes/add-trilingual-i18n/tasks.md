# Tasks

## 1. 语言数据源与语言化路由（地基）

- [x] 1.1 新建 `src/lib/i18n/locales.ts`：定义三种语言的权威数据 —— `code`（`en`/`zh-CN`/`ja`）、路径前缀（``/`/zh`/`/ja`）、`displayName`、`htmlLang`、`ogLocale`、`hreflang`、是否默认语言、本地存储键名。该模块**不得 import React 或任何浏览器全局**，以便 `vite.config.ts` 在构建期直接 import。验证：新增 `src/lib/i18n/locales.test.ts` 断言三种语言齐备、恰好一个默认语言、前缀互不重复且英语前缀为空串。
- [x] 1.2 实现 `resolveLocale({ pathname, stored, navigator })` 纯函数，按「路径前缀 > 已保存偏好 > `navigator.language` > 英语」返回语言码；路径前缀必须是完整的首段匹配，`/fr/video-frame/` 不得被识别为语言前缀。验证：单测穷举优先级四种来源、`/zh`/`/ja` 前缀命中、`/fr` 与 `zh` 类近似值不命中、全部缺失时回退英语（对应 `i18n` 的「语言解析优先级」与「语言前缀不干扰工具路由判定」）。
- [x] 1.3 在 `src/lib/tool-navigation.ts` 中实现前缀剥除后再匹配工具路径，使 `readToolRoute()` 对 `/ja/image-watermark/`、`/zh/id-photo/` 返回正确工具。验证：扩展 `src/lib/tool-navigation.test.ts`，覆盖三种语言 × 7 个工具的完整矩阵，并保留既有中文根路径用例不变。
- [x] 1.4 新建 `src/lib/i18n/routes.ts`，提供「语言 + 工具 → 规范路径」与「语言 + 工具 → 语言化链接」的唯一实现，供导航、tab、相关工具、canonical、hreflang、sitemap 共用。验证：单测断言 21 组「语言 × 工具」路径全部正确，且英语无前缀、中文带 `/zh`、日语带 `/ja`；再断言没有任何调用点直接拼写裸路径（用源码扫描断言 `TOOL_PATHS` 不被直接用于生成 `href`）。

## 2. 构建期入口页生成器

- [x] 2.1 新建入口页渲染模块：输入「语言 + 工具」，输出完整 HTML，内含 `<html lang>`、`og:locale`、自指 `canonical`、四条 `hreflang`（含 `x-default` → 英语根路径）、按该语言输出的标题/描述/关键词/JSON-LD、`<noscript>` 导航、主题防闪烁脚本；并**保留** `__SITE_URL__` 与 `__ANALYTICS_ID__` 占位符不替换。验证：单测对 21 组输入断言占位符仍在、`canonical` 与 `hreflang` 取值正确、四条 alternate 齐备。
- [x] 2.2 新建 Vite 插件 `offline-tools:i18n-entries`：`resolveId`/`load` 产出虚拟入口，`configureServer` 提供 dev 中间件，**dev 与 build 复用同一个渲染函数**；插件须排在 `siteMetaPlugin` 之前，使 21 个入口同样经过既有占位符注入。验证：`pnpm build` 成功，且 `dist/` 下 21 个入口 HTML 存在、无残留占位符。
- [x] 2.3 把 `build.rollupOptions.input` 由 7 个手写路径改为 21 个语言化入口，并移除 `index.html` 与 6 个 `*/index.html` 的手写源文件（内容改由生成器产出）。验证：产物中 21 个入口的 `<title>`、canonical、JSON-LD 与生成器输出一致；`pnpm dev` 下逐个抓取 21 条 URL 返回的 HTML 与构建产物结构一致（dev/build 一致性断言）。

## 3. 迁移测试契约（防早期组翻车）

- [x] 3.1 表驱动化 `tests/build-output.test.mjs`：把 8 处硬编码 `<html lang="zh-CN">`、7 条标题字面量与 manifest 名称断言改为由语言数据源驱动，覆盖 21 个入口。验证：`pnpm test` 通过；随后临时新增一种语言到数据源，断言自动覆盖新语言且**无需改写断言结构**，确认后回退该临时改动。
- [x] 3.2 扩展 `tests/site-url-embed.test.mjs`：在既有「host 唯一」基础上增加「每语言绝对 URL 正确」「hreflang 互指闭合」「`x-default` 与英语同指向根路径」「中文 alternate 指向 `/zh/…`」断言，且不把 host 字面量写入测试。验证：`pnpm test` 通过；`site-url` 的四个新场景各被至少一条断言覆盖。
- [x] 3.3 重跑并确认 PWA 预缓存修订号一致性断言（插件顺序改变会影响 `closeBundle` 时序）。验证：`tests/site-url-embed.test.mjs` 的修订号断言通过，`pnpm build` 不再出现「未由 transformIndexHtml 注入」告警。

## 4. 中文词条抽取（不改动行为）

- [x] 4.1 建立词条目录与运行时：`src/lib/i18n/messages/` 下 `en.ts`、`zh-CN.ts`、`ja.ts` 三份词条，键集合由联合类型约束为完全一致；实现 `LocaleProvider` + `useT()`（无第三方依赖），支持带参数插值的函数条目（如「已导出 N 张帧」）。验证：新增单测断言三份词条的键集合完全相同（缺键即编译失败）、插值条目在三种语言下均产出预期字符串。
- [x] 4.2 把 `src/` 中面向用户的文案迁移到 `zh-CN` 词条并在组件中改用 `useT()`，覆盖导航、tab、按钮、标签、占位提示、错误与完成反馈、无障碍标签、页脚声明（约 40 个文件；`src/lib/analytics.ts`、`tool-analytics.ts`、`route-analytics.ts` 中的中文仅为注释，不在迁移范围）。验证：新增「残留中文扫描」测试 —— 渲染路径可达的源文件中，除注释与用户数据外不得出现中文字符；该测试通过即视为抽取完整。
  - **完成**。`src/` 下已无任何硬编码中文文案：扫描测试从「棘轮」转为**绝对断言**，`src/`（排除 `i18n/` 词条目录与法定标识）出现任何中文文案即失败。
  - 迁移规模（AST 口径）：`App.tsx`(77)、`ImageProcessor`(67)、`IdPhoto`(55→0)、`video-compressor`(52)、`tool-seo-content`(45)、`A4ImageLayout`(28)、`ImageProcessor` 渲染层(54) 等，共 9 个文件从数百条中文降到 0。
  - **底层错误消息采用「错误码」方案**：`src/lib/` 纯函数与 worker 抛 `LocalizedError`（携带词条键），界面层 `translateError(t, error)` 翻译；`LocalizedErrorCode` 只允许 `err.*` / `img.err*` 两类键，写错键名在编译期被挡住。
  - **指标可信性**：扫描实现前后两版手写正则都不可靠（第一版跨行字符串只统计第一段，把 `IdPhoto.tsx` 的 48 条计成 10；第二版无法处理「模板字面量里嵌 JSX」），最终改用 TypeScript 解析器走 AST。
  - **顺带修复**：迁移暴露了 6 处「源码级契约」测试在字面量搬走后**静默失效**（`{confirmLabel}`、`停止压缩`、`批量抽帧失败`、`停止导出`、`停止处理`、`处理全部`）—— 它们仍在通过，只是不再检查任何东西。已全部改为断言词条键，并做了一次全量扫描确认没有遗漏。
  - 说明：`components/icp-footer.tsx` 的 ICP 备案号是法定标识，三语下都必须原样呈现，已在扫描测试中显式豁免并加反向断言（确认它确实只含这一条中文）。

## 5. SEO 内容与元信息三语化

- [x] 5.1 把 `src/lib/seo.ts` 的 `SEO_PAGES` 改为「语言 × 工具」结构，标题、描述、关键词、JSON-LD 按语言取值，`inLanguage` 与该语言一致；`useRouteSeo` 按当前语言更新文档头。验证：扩展 `src/lib/seo.test.ts` 断言 21 组数据的 `path`、`inLanguage` 与语言一致，且中文使用 `zh-CN` 单一标签写法。
- [x] 5.2 把 `src/components/tool-seo-content.tsx` 的正文长文（约 1250 字）按三语改写，en/ja 按各自检索习惯撰写而非逐字直译；`/zh/` 页不得残留英文正文，`/ja/` 页不得残留中文正文。验证：扩展对应组件测试断言三种语言下均渲染该语言正文；并新增断言 `/zh/` 与 `/ja/` 页面正文不含其他语言的长段文本。
  - 已完成：正文长文移入 `src/lib/i18n/seo-long-form.ts`（三语 × 5 工具 × 3 段），新增 `seo-long-form.test.ts` 断言三语齐备、段落数、**语言间标题/引言/段落标题互不相同**、英语不含中文字符、中文逐字保留。
- [x] 5.3 更新 PWA manifest 的语言声明与多语言现实一致（避免只声明单一 `lang` 与实际三语产物的矛盾）。验证：`pnpm build` 后检查 `dist/manifest.webmanifest`，并在 `tests/build-output.test.mjs` 中断言其语言字段由数据源驱动。
  - 已完成：manifest 改为声明**默认语言**（`lang: "en"`）与默认语言的英文名称/描述 —— 站点有 21 个语言入口但 PWA 每次安装只有一份 manifest，因此声明默认语言并把「已保存偏好在首帧前生效」作为切换机制。契约测试断言 `lang === "en"`、名称取自英语数据源且不含中文。

## 6. 语言切换与语言保持

- [x] 6.1 新建页头语言切换器组件（置于 `src/components/tool-header.tsx` 的 `header-actions`，与一级分组同处页头），列出英语/简体中文/日语三项并标记当前语言，具备 `aria-current`/选中语义与可见焦点，可用键盘操作。验证：组件测试断言三项齐备、当前项带语义、键盘可聚焦与切换；`pnpm lint` 通过 jsx-a11y 规则。
  - 已完成：新增 `src/components/language-switcher.tsx`，用 shadcn `Select`（combobox 语义 + 键盘操作），置于页头与主题按钮相邻。触发器**直接渲染当前语言名**而不是 `<SelectValue />` —— 后者在组件级 SSR 里为空，触发器会只剩箭头图标。选项集合由 `LOCALE_CODES` 决定，语言名用该语言自身书写。
- [x] 6.2 实现切换行为：写入语言偏好到本地存储（三种语言一视同仁，含英语），并用整页导航跳到同一工具在目标语言下的规范路径；保持当前工具不丢。验证：单测覆盖 7 个工具 × 3 个目标语言的切换目标路径；断言「以已保存偏好渲染 `/` 不构成显式选择、不改写偏好」。
  - 已完成：`languageSwitchPath()` 纯函数（63 条穷举断言）；存储抽为可注入的 `LocaleStorage`，`locale-storage.test.ts` 断言「显式前缀才写偏好、无前缀路径不写、三种语言一视同仁、存储不可用时静默降级、偏好键与主题键互不覆盖」。切换用 `location.assign` 整页导航（理由见 design 决策 6）。
- [x] 6.3 让站内导航（一级分组、二级 tab、相关工具、品牌回首页）使用语言化链接，目标语言取 `resolveLocale` 的结果而非当前路径前缀；同语言内仍走 `pushState` 不触发整页加载。验证：单测覆盖「`/ja/` 内互跳」「英语无前缀互跳」「`/zh/` 内互跳」「按偏好渲染 `/` 时链接带 `/zh` 前缀」四种情形。
  - 已完成：`tool-header`、`tool-tabs`、`tool-links`、`ToolHome` 改用 `toolHref(locale, route)`；三个组件测试各含「链接跟随当前语言」断言（en 无前缀 / zh 带 `/zh` / ja 带 `/ja`）。
- [x] 6.4 验证 hydration 一致性。
  - **实测结论与 design 决策 5 的假设不同**：站点是**纯客户端渲染** —— 21 个入口的 `<body>` 只有 `<div id="root"></div>` 与一个 `<noscript>` 区块，没有任何 React 渲染的标记，因此不存在「服务端渲染的链接」可供比对。
  - 已用 E2E 守住该前提：21 个入口都不含外壳标记、`noscript` 之外没有 `<a>`、`noscript` 内链接都带本语言前缀。
  - 顺带修掉一处真实缺陷：语言切换器触发器原先用 `<SelectValue />`，它在 SSR 下渲染为空，只剩箭头图标；改为直接渲染当前语言名。
- [x] 6.5 确认统计上报不受语言路径影响：`route-analytics` 应继续上报语言无关的工具路径。验证：扩展 `src/lib/route-analytics.test.ts`，在 `/zh/video-compress/` 与 `/ja/video-compress/` 下断言上报路径均为 `/video-compress/`（不带 `/zh`、`/ja` 前缀）。
  - 已完成：`reportRouteChange` 收的是 `ToolRoute`（已剥前缀的工具身份），语言根本不参与；新增「PV 口径语言无关」一组断言（同一工具在不同语言下上报一致、路径永不含三种前缀、`analyticsPathFor` 无前缀）。

## 7. SEO 收口：sitemap 与 hreflang

- [x] 7.1 改为构建期生成 `dist/sitemap.xml`：21 条 URL，每条带 `xhtml:link` 指向三种语言及 `x-default`，互指集合闭合；`lastmod` 保持既有语义，`robots.txt` 的 Sitemap 声明不变。验证：新增产物测试断言 21 条条目、每条的 4 条 alternate 齐备、从任一条出发跟随 alternate 回到自身、`x-default` 指向英语根路径。
- [x] 7.2 确认 `hreflang` 在 HTML 与 sitemap 两处一致（同一数据源驱动），且中文 `hreflang` 取值为 `zh-CN`。验证：新增跨产物断言，比对某工具三语 HTML 的 alternate 与 sitemap 中对应条目完全相同。
  - 已完成：两处都由 `listHreflang()` 驱动；`site-url-embed.test.mjs` 断言 21 条目各含 4 条 `xhtml:link`、中文指向 `/zh/…`、`x-default` 与英语同指、条目自指闭合。

## 8. 集成验收

- [x] 8.1 端到端验收外部直链与语言保留：对 21 条 URL 逐一断言返回 HTML 的语言与路径一致、无重定向、无客户端改写，且已保存偏好不得覆盖传入路径的语言。验证：新增集成测试覆盖 `i18n` 的「支持外部直链并保留传入语言」全部场景。
  - 已完成：新增 `tests/i18n-e2e-embed.test.mjs`，用**真实 HTTP** 把 `dist/` 当作静态站点提供（与部署形态一致，不需 rewrite）：逐条 `fetch` 21 条 URL，断言 200 且无 `location` 头、`<html lang>` 与标题取自路径语言、canonical 自指、日语页面不含英语/中文标题。
- [x] 8.2 端到端验收跨页面与跨会话的语言保持。
  - 已完成：E2E 断言每个语言入口的 4 条 hreflang 互指覆盖三语言 + `x-default`、互指目标全部可达（跟随不 404）、同一工具三种语言路径互不相同；并断言打包产物含语言偏好键。偏好的读写规则由 `locale-storage.test.ts` 的 7 条断言覆盖。
- [x] 8.3 全量回归：`pnpm build && pnpm test && pnpm lint` 全部通过，且 21 个入口在 `dist/` 中齐备。验证：三条命令退出码为 0，`pnpm test` 输出中新增的 i18n 相关测试全部通过。
  - 已完成：三条命令退出码均为 0，`pnpm test` 为 **346 tests / 346 pass**，`dist/` 下 21 个入口齐备。
  - **环境前提（需记录）**：本机 corepack 锁定 `pnpm@10.15.0`，而 PATH 上的 pnpm 是 11.28.5，且 corepack 无权写入 `~/.cache/node/corepack`（沙箱拒绝 EPERM），因此无法用 `corepack prepare` 对齐版本。解法：把已缓存的 10.15.0 包一个 PATH 前置的可执行 shim（`/tmp/pnpmbin/pnpm` 转调 `~/.cache/node/corepack/v1/pnpm/10.15.0/bin/pnpm.cjs`），使脚本内嵌的嵌套 `pnpm` 调用也命中该版本。**这是本地环境差异，不是仓库问题，仓库的 `packageManager` 字段未修改。**

## 9. 真实浏览器端到端（实现完成后补充）

- [x] 9.1 真实浏览器端到端：新增 `scripts/e2e-browser.mjs`（`pnpm test:e2e`），用**本地 Chrome + CDP**（Node 内置 WebSocket，不引入 Playwright/Puppeteer）驱动 52 条断言：21 条 URL 在真实浏览器中的 `document.documentElement.lang` 与路径一致且无重定向；语言切换器**真实交互**（展开 → 列出三种语言 → 选中 → 整页导航 → 保持当前工具 → 切回英语回到无前缀路径）；跨会话偏好写入与重开生效；无 console 错误。
  - 这一步补上了 6.4 原先标为「只能人工」的检查：**Radix Select 的弹层只在真实浏览器中挂载**，此前所有 SSR/HTTP 测试都碰不到它。
  - 过程中确认两件事：(1) 合成 `.click()` 无法驱动 Radix Select，必须用 CDP `Input.dispatchMouseEvent` 派发真实鼠标事件；(2) macOS 的 Chrome 忽略 `--lang`，需用 CDP `Emulation.setLocaleOverride` 才能稳定控制解析链第 3 级（`navigator.language`）—— 最初 7 条断言失败正是因为本机系统语言是 zh-CN，属**测试环境差异**而非站点缺陷。
  - 前置：本机需有 Chrome，且允许 `--no-sandbox`（DSH 沙箱下 Chrome 自带沙箱无法初始化）。


## Workflow follow-up

- 实施完成并确认验收后，归档本 change（`/openspec-archive-change`），把 `i18n` 新 capability 与 `site-url`、`navigation`、`site-content` 的 delta 合入主 spec。
- 归档时确认 `i18n` 的 `## Purpose` 被正确写入主 spec（新 capability 的 Purpose 由归档复制，不留 TBD 占位）。
- 发布属于运维动作、不在本 change 的代码范围内：发布后按 design 风险 8 主动提交新 sitemap 并观察中文排名变化；因默认语言与中文 URL 均改变，回滚前需确认 `/zh/`、`/ja/` 尚无外部引用。
