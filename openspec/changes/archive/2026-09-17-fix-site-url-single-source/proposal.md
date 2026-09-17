## Why

线上站点已迁移到 `https://offline-tools.colors-cc.top/`（腾讯云 EdgeOne，push 到 main 触发云端构建），但仓库里仍有 56 处硬编码的旧域名 `https://framecut-offline.douxc512.chatgpt.site`，并且已随构建部署到生产。旧域名当前返回 401，于是新域名在生产上同时出现三重失效：`robots.txt` 声明的 sitemap 指向 401、六个页面的自指 `canonical` 把权威版本判给死域名、`og:image` 指向 401 导致分享无图。这使新域名无法被搜索引擎正常收录，且站点身份（绝对 URL）没有任何单一来源，第二次换域名仍会重演。

## What Changes

- 在构建配置中建立站点绝对 URL 的单一来源，作为换域名的唯一改动点；支持可选环境变量覆盖，默认值不依赖任何平台控制台配置。
- 站点绝对 URL 由打包流程在构建期统一注入，覆盖六个 HTML 入口的 `canonical`、`og:url`、`og:image`、`twitter:image` 与内联 JSON-LD，以及 `sitemap.xml`、`robots.txt`。
- 替换现存全部 56 处旧域名引用（源码、静态页面、`public/` 静态资源、文档），修复生产上指向废弃域名的绝对 URL。
- 新增产物契约测试：断言构建产物中所有绝对 URL 的 host 唯一、等于配置值，且不出现废弃域名；测试不硬编码字面域名，避免第三次换域名时再次产生维护点。
- 现有 `tests/build-output.test.mjs` 中两处针对旧域名的断言改为一致性断言。

## Capabilities

### New Capabilities

- `site-url`: 站点绝对 URL（绝对地址的 host 与协议）的单一来源定义、构建期注入到 HTML 与 `public/` 静态资源的机制，以及产物中绝对 URL 一致性的可验证约束。

### Modified Capabilities

无。`site-content` 覆盖的是相关工具链接、首页 ItemList 完整性与许可页脚；`image-a4-layout` 中提及 canonical 的条目只要求「每页具备独立 canonical」，不含 host 来源或一致性约束，本次不改变其行为要求。

## Impact

- 构建配置：`vite.config.ts`（新增站点 URL 来源与构建期替换）。
- 源码：`src/lib/seo.ts`（`SITE_URL` 改为引用单一来源）。
- 静态页面：`index.html` 与 `video-frame/`、`video-compress/`、`image-compress/`、`image-watermark/`、`image-a4-layout/` 五个入口 HTML。
- 静态资源：`public/sitemap.xml`、`public/robots.txt`（改为占位符 + 构建期注入）。
- 测试：新增站点 URL 产物契约测试并接入 `package.json` 的 `test` 脚本；修订 `tests/build-output.test.mjs` 的旧域名断言。
- 文档：`project-map.md` 的部署地址陈述。
- 运行时不改变：无功能逻辑、样式、依赖增删；六个路由路径不变（新旧域名路由结构一致，仅 host 变化）。
- 上线后需要人工跟进（不属于代码改动）：向搜索引擎提交新域名的 sitemap 与收录请求；旧域名 401 的站点地图条目会在下一次抓取后失效。
