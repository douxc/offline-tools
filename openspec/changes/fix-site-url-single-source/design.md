## Context

见 `proposal.md` 的 Why。设计受以下既有事实约束：

- 部署链路为「push 到 main → EdgeOne Makers 云端构建 → 输出静态产物」。构建命令在 bash 中执行，环境可提供环境变量；域名切换只改过 DNS CNAME，代码从未被要求同步。
- 产物是静态多入口应用：六个 HTML 入口由 `vite.config.ts` 的 `rollupOptions.input` 声明，`public/` 下的 `sitemap.xml`、`robots.txt` 按原样复制到产物。
- 客户端唯一持有站点 URL 的位置是 `src/lib/seo.ts` 的模块级常量 `SITE_URL`，它同时派生出 `OG_IMAGE_URL` 并被 `useRouteSeo()` 用于路由切换时更新 meta。
- PWA 预缓存清单由 `vite-plugin-pwa` 生成在 `dist/sw.js`，其中包含七个文本文件的 md5 内容修订号：`robots.txt`、`manifest.webmanifest` 与六个 HTML 入口。实测清单不含 `sitemap.xml`（`globPatterns` 未覆盖 `xml`）。
- 该清单把文本文件的内容修订号固化在 Service Worker 里，因此任何在清单生成之后才改写产物的做法都会引发缓存一致性问题。

## Goals / Non-Goals

**Goals:**

- 站点绝对 URL 有唯一定义位置，换域名是单点改动。
- 六个 HTML 入口与 `public/` 静态资源中的绝对 URL 全部由构建期产出，而非人工填写。
- 一致性可自动验证，且测试本身不成为新的换域名维护点。

**Non-Goals:**

- 不引入运行时读取域名的逻辑。站点 URL 是构建期常量，覆盖它需要重新构建。
- 不改动路由结构、相对链接与站内导航；新旧域名路径完全一致，本次只改 host 来源。
- 不改动 PWA 缓存策略、og 图片体积、Service Worker 更新策略。
- 不引入 CI 工作流；一致性校验复用现有 `pnpm test` 入口（`pnpm test` 已先执行 `pnpm build`）。

## Decisions

### 决策 1：单一来源放在 `src/lib/site.ts`，构建期读取并支持环境变量覆盖

新增纯常量模块 `src/lib/site.ts`，导出默认站点 URL 与 `OG_IMAGE_URL`。`vite.config.ts` 与环境无关地导入它作为默认值，再用 `process.env.VITE_SITE_URL` 做可选覆盖，覆盖结果供构建期注入使用；`src/lib/seo.ts` 删除本地常量，改为从 `src/lib/site.ts` 导入。

选择理由：该模块需同时被构建配置（Node 环境）与客户端代码（浏览器环境）引用，放在 `src/lib/` 与项目现有约定一致（`tool-navigation.ts` 即承担同类「单一来源」职责），且无浏览器依赖，`vite.config.ts` 可安全导入。

考虑过的替代方案：

- **把默认值写在 `vite.config.ts`，客户端通过 `define` 全局注入。** 会让构建配置与客户端代码互相牵引，且为一个常量引入全局替换机制，收益不抵复杂度。
- **放在仓库根的独立文件（如 `site.config.ts`）。** 与现有 `src/lib/*` 单一来源约定不一致，且需要额外处理 `tsconfig` 包含范围。

**默认值来源反过来决定了测试不具备环境变量能力**：测试断言依据 `src/lib/site.ts` 的默认值，而构建在无覆盖时也使用同一默认值，因此本地与云端构建结果一致、可复现。这是刻意的取舍——生产环境不需要配置任何变量即正确。

### 决策 2：占位符 token 统一注入，替换发生在打包流程内（用户已确认）

六个 HTML 的 canonical/og:url/og:image/twitter:image/JSON-LD 绝对 URL，以及 `public/sitemap.xml` 的全部条目与 `public/robots.txt` 的 Sitemap 声明，一律改写为占位符 token（定为 `__SITE_URL__`，采用 Vite 惯用的双下划线包裹形式，降低与真实文案冲突的概率；由于不含 `.` 与协议前缀，也不会被绝对 URL 扫描误判）。

替换由 `vite.config.ts` 内一个自定义插件在构建期完成，机构上分两层，两层职责互补：

1. `transformIndexHtml` 处理 HTML 入口。这是 Vite 处理 HTML 的规范机制，**注入发生在构建管线内**，因此生成的 HTML 直接携带最终值。实测六个入口逐一触发。
2. 插件的 `closeBundle` 遍历产物目录，替换全部文本文件中残留的 token。它**主要负责** `public/` 复制过来的 `sitemap.xml` 与 `robots.txt`（这两个文件不经过 HTML 管线），同时兜住第 1 层未覆盖的入口。遍历方式为「读取文件、仅当内容含 token 时改写」，因此无需维护文件类型白名单，且二进制文件天然不命中。

**主机制与兜底层的关系，以及为什么"顺序约束"不是可靠的做法。** 两层叠加意味着第 1 层静默失效时第 2 层会掩盖症状，产物依然正确 —— 这对线上是好事，对可观测性是坏事。实现时曾试图用「插件在 `plugins` 数组中必须早于 `VitePWA(...)`」这条顺序约束来保证缓存一致性，但验证发现**该约束无法被产物测试证明**：把插件移到 `VitePWA` 之后重建，修订号一致性断言依然通过（因为兜底层仍在修订号计算前完成了替换）。一条测不出来的顺序约束不是可靠机制。

因此改为两条可验证的机制：

- HTML 入口的主机制失效时，`closeBundle` 会识别出「本应由 `transformIndexHtml` 处理的产物仍带 token」，并在构建期发出显式告警（已实测：把 `transformIndexHtml` 变成空操作后，告警列出全部六个入口）。机制退化因此可观测，而不是静默降级。
- 缓存一致性由产物断言守住 —— 比对 `dist/sw.js` 中七个文本文件的 revision 与实际内容 md5。该断言实测能捕获注入整体缺失（插件被移除时 4/6 断言变红）。

考虑过的替代方案：

- **只做 `closeBundle` 后置替换。** 机制单一，但会让缓存一致性完全依赖插件顺序（即上述不可测的约束），因此不采用。
- **只做 `transformIndexHtml`。** 无法覆盖不经过 HTML 管线的 `public/` 静态资源。
- **单独写一个构建后脚本串在 `package.json` 的 build 链上。** 需要自行处理 `dist` 路径与插件执行顺序，且与 Vite 的 HTML 管线脱节，错误更难定位。用户已明确选择交由打包流程处理。

### 决策 3：可用性断言分两类

- **一致性断言（长期保留）**：新增 `tests/site-url-embed.test.mjs`，从 `src/lib/site.ts` 导入默认站点 URL，断言产物中所有绝对 URL 的 host 唯一且等于配置值、无残留 token、无历史废弃 host。测试不写 host 字面量。
- **可读性断言（本次一次性修订）**：`tests/build-output.test.mjs` 现有两处断言把 A4 页 canonical/og:url 的字面量钉在旧域名上（第 82、88 行）。它们当前表达的是「值等于那个具体域名」，替换后必须同步修改，否则测试会因断言旧域名而继续通过——**这两处不改会形成假绿**。修订为与配置值比较。
- 废弃 host 清单在测试中保留为字面量列表（当前含 `framecut-offline.douxc512.chatgpt.site`）。这是刻意的：它表达的是「历史上用过、不得回流的 host」，随换域名增长而非需要替换。

### 决策 4：文档同步，但不重复定义

`project-map.md` 第 5 行的部署地址陈述改为指向单一来源（描述"站点 URL 由 `src/lib/site.ts` 定义"），而不是再写一个域名副本，避免文档成为第 57 处硬编码。

## Risks / Trade-offs

- [`transformIndexHtml` 在六个入口的多入口构建中是否逐一触发] → 实现时以任务中的验证点确认；`closeBundle` 兜底层与「无残留占位符」断言保证即便某入口未被覆盖也不会产出错误产物。
- [注入机制若被后续改动破坏，产物会静默降级为「兜底层生效」而不是报错] → 插件在 `closeBundle` 中识别本应由 `transformIndexHtml` 处理的产物仍带 token 的情形并发出构建期告警；产物断言另行守住修订号一致性。两者均已用反例实测（见决策 2）。
- [替换写坏产物（例如 token 意外出现在二进制文件中）] → token 含双下划线且不含 `.`，二进制命中概率极低；`closeBundle` 仅改写含 token 的文件，且既有产物测试（`build-output.test.mjs`）会校验产物结构与资源存在性。
- [EdgeOne 项目设置里的构建命令若不是 `pnpm build`，PNG 压缩 Worker 不会生成] → 本次不改动该配置。实测线上 `/assets/image-compress-worker.js` 为 663,411 字节、与本地 `build:image-codecs` 产物完全一致，可判定当前配置正确。风险记录在案，验证方式为部署后确认该文件仍为 200 且体积不变。
- [首次部署后搜索引擎仍持有旧信号] → 代码修复不解决存量：需在部署后向搜索引擎提交新域名 sitemap 并请求重新抓取。该动作属于发布后人工步骤，写入 `tasks.md` 的收尾项。
- [仓库根存在未跟踪的 `.agents/` 目录，push 到 main 会触发部署并可能将其纳入仓库] → 与本次域名改动无关；在收尾项中提示确认是否需要纳入版本管理或忽略，不擅自修改 `.gitignore`。

## Migration Plan

1. 按 `tasks.md` 完成改动，本地运行 `pnpm test`（其内部先执行 `pnpm build`）验证产物契约。
2. 合并/push 到 main，由 EdgeOne 自动构建部署。
3. 部署后线上核验：六个页面的 canonical 与 og:url、`/sitemap.xml` 的全部条目、`/robots.txt` 的 Sitemap 声明均为新 host；`/assets/image-compress-worker.js` 仍为 200。
4. 提交新域名 sitemap 并请求收录（站点已备案，主体与 EdgeOne 境内接入一致）。
5. 回滚策略：改动集中在构建配置、模板与测试，回滚即 revert 该提交并重新 push；无数据迁移、无不可逆副作用。

## Open Questions

- 是否为站点 URL 增加一个仅用于验证覆盖机制的测试（例如断言提供覆盖变量时构建使用覆盖值）。这需要在测试中能驱动一次带环境变量的构建，成本明显高于收益，倾向不做；不影响本设计的规格与任务划分。
