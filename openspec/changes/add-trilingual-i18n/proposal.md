# Proposal

## Why

站点目前是「事实上的中文单语」：语言在三个互不知情的层各自写死 —— 7 个手写 HTML 入口的 `<head>`、`src/lib/seo.ts` 的运行时 SEO 数据、以及分布在 `src/` 约 40 个文件里的界面文案。更糟的是第一层与第二层内容完全重复：7 个入口页的标题/描述/关键词/JSON-LD 与 `SEO_PAGES` 逐字相同，靠 `tests/build-output.test.mjs` 的 7 条标题断言防止漂移。该重复在 7 页时靠测试勉强维持，一旦语言维度介入（页数变 3 倍）就无法维持。

同时 www.colors-cc.top 门户需要把访客直接送到对应语言的目标页（例如 `/ja/video-frame/`）。本站目前没有任何非中文路径，因此门户无从链接到 en/ja 页面，en/ja 也无法被搜索引擎独立收录。

## What Changes

- **BREAKING**：产品从中文单语变为**以英语为默认**的中（zh-CN）/英（en）/日（ja）三语。英语占据根路径，中文从根路径迁到 `/zh/`，因此既有 7 条中文 URL 的语义由「中文」变为「英语」。
- 引入**单一语言数据源**：标题、描述、关键词、JSON-LD、界面文案按「语言 × 工具」组织在一处；7 个手写 HTML 入口改为构建期由该数据源生成的 **21 个真实入口页**（7 工具 × 3 语言），从此不再手工复制 `<head>`。
- URL 策略：英语使用根路径（`/`、`/video-frame/`），中文使用 `/zh/…`，日语使用 `/ja/…`；每个语言版本有独立 `canonical`，并输出 `hreflang` 互指（`x-default` 指向英语根路径）。**不**输出 `/en/` 前缀。旧中文 URL **不做重定向**。
- 每个语言页面的 `<html lang>`、`og:locale`、JSON-LD `inLanguage` 与自身语言一致；`<noscript>` 导航与静态 JSON-LD 同样按语言输出。
- 外部跳转以**直链目标语言规范路径**的方式支持：门户链接 `/zh/video-frame/` 或 `/ja/video-frame/` 即可，本站 SHALL NOT 依赖任何语言查询参数。**传入路径携带的语言 SHALL 被保留**，不被接收者既有的偏好或浏览器语言覆盖。
- **语言在跳转与再次访问间保持**：用户选定语言后，站内切换工具页、关闭后重新打开都沿用该语言，不回到英语。
- 语言解析：**只由 URL 路径前缀决定** —— 带 `/zh` 或 `/ja` 前缀即该语言，其余（含根路径）一律英语。站点不读已保存偏好、不读 `navigator.language`，因此同一 URL 对所有访客渲染同一语言，与 `hreflang`/`sitemap` 的「一个 URL 一种语言」声明一致。（早期方案曾设「路径 > 偏好 > 浏览器语言 > 英语」四级优先级，实施后收紧为单一规则：路径即语言。）
- 新增**语言切换器**（页头），切换时保持当前工具页不丢上下文。
- 界面文案接入轻量词条目录（不引入重型 i18n 依赖），使离线 PWA 下三种语言完整可用。
- `sitemap.xml` 扩展为 21 条 URL 并携带 `xhtml:link` 语言互指；PWA manifest 的语言声明与多语言现实一致。
- SEO 正文长文（`src/components/tool-seo-content.tsx`，约 1250 字）按 en/ja 检索习惯改写，不做逐字直译。

## Capabilities

### New Capabilities

- `i18n`: 语言集合、默认语言与规范路径的中枢 —— 语言解析（路径即语言）、可供外部直链并保留传入语言的多语言规范 URL（含「不依赖语言参数、不重定向」的保证）、语言切换、跨页面与跨会话的语言保持、`<html lang>` 与 `hreflang`/`canonical` 语言语义、以及语言维度的词条查找。这是「站点支持哪些语言、如何决定当前语言、如何保持与切换」的长期归属。

### Modified Capabilities

- `site-url`: 现要求「产物中所有绝对 URL 的 host 唯一」且未定义语言维度。三语化后需明确：host 仍然唯一，但每个语言有各自的绝对 URL；`canonical` 指向自身语言版本；`hreflang` 互指集合与 `sitemap` 条目必须覆盖全部语言且相互闭合。语言路径不得引入新 host 或废弃 host。
- `navigation`: 现要求「每个页面顶部导航提供两个一级分组」「当前页高亮并与真实路由一致」。新增语言维度后需明确：一级分组高亮判定必须在剥除语言前缀后仍然正确；新增语言切换器入口，且切换语言时保持当前工具不丢失。
- `site-content`: 现要求「首页 JSON-LD ItemList 列出全部 5 个工具」「`<noscript>` 导航列出全部 5 个工具」。该要求隐含单语。需明确这些结构化数据与无脚本导航在每个语言条目下都以该语言输出且条目完整。

## Impact

**构建体系**
- `vite.config.ts`：`build.rollupOptions.input` 由 7 个入口扩为 21 个；新增构建期 HTML 生成步骤（从语言数据源产出入口页）。现有 `siteMetaPlugin` 的占位符注入机制（`__SITE_URL__`/`__ANALYTICS_ID__`）必须继续作用于全部 21 个入口，且 `closeBundle` 兜底与 PWA 预缓存修订号一致性不受影响。
- `public/sitemap.xml`：7 条扩为 21 条 + `xhtml:link`。
- 7 个手写 `*/index.html`：由手工维护改为生成产物（源文件形态在 design 中确定）。

**运行时**
- 新增：语言数据源模块、语言解析与切换模块、页头语言切换器组件。
- 改造：`src/lib/seo.ts`（按语言取数据）、`src/lib/tool-navigation.ts`（路径前缀解析与语言化链接生成）、`src/components/tool-header.tsx`、`src/components/tool-seo-content.tsx`、约 40 个含界面文案的 `src/` 文件（文案抽取）。

**测试**
- `tests/build-output.test.mjs`：8 处 `<html lang="zh-CN">` 断言、7 条标题字面量、manifest 名称断言需改为由语言数据源驱动的表驱动断言（否则新增语言即失败）。
- `tests/site-url-embed.test.mjs`：host 唯一性断言需扩展为「host 唯一 + 每语言绝对 URL 正确 + hreflang 闭合」。
- 新增：语言解析（含「未知语言路径不被交付为其他语言」）、外部直链保留传入语言、跨页面/跨会话语言保持、切换保持工具、21 入口产物一致性、以及真实浏览器端到端（Radix 弹层交互、站内链接点击保持前缀）的测试。

**已查明、不再是风险**
- 百度统计 PV **不受影响**：`src/lib/route-analytics.ts` 上报的是 `SEO_PAGES[route].path`（语言无关的工具路径，如 `/video-compress/`），不是 `window.location.pathname`。语言进入 URL 后 PV 仍按 7 条工具路径聚合，无需改动，也无报表口径变化。

**不在本次范围**
- www.colors-cc.top 门户侧的改造（本站只保证 URL 形态可供其直链）。
- 繁体中文与其他语言。
- 旧中文 URL 的重定向：`/`、`/video-frame/` 等 7 条既有中文地址改为英语页且**不做 301**，中文改由 `/zh/…` 承载。
