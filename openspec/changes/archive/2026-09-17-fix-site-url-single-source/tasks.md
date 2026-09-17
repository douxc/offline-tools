## 1. 建立站点 URL 单一来源

- [x] 1.1 新增 `src/lib/site.ts`：导出默认站点绝对 URL（`https://offline-tools.colors-cc.top`，无尾斜杠）与派生的 OG 图片绝对 URL；模块为纯常量、不含任何浏览器或 Node 专属依赖 — verify: 文件存在，且 `pnpm lint` 通过
- [x] 1.2 `src/lib/seo.ts` 删除本地 `SITE_URL`/`OG_IMAGE_URL` 常量，改为从 `src/lib/site.ts` 导入 — verify: `grep -rn "framecut-offline\|douxc512" src/` 无输出；`src/lib/seo.test.ts` 通过
- [x] 1.3 `vite.config.ts` 导入默认值并支持 `process.env.VITE_SITE_URL` 可选覆盖，将解析结果作为构建期注入的唯一输入 — verify: 未设置该变量时 `pnpm build` 成功，产物 host 为默认值

## 2. 模板与静态资源改为占位符

- [x] 2.1 六个 HTML 入口（`index.html` 与 `video-frame/`、`video-compress/`、`image-compress/`、`image-watermark/`、`image-a4-layout/` 各 `index.html`）中的 canonical、og:url、og:image、twitter:image 与内联 JSON-LD 绝对 URL 全部改写为 `__SITE_URL__` 占位符（保留各自路径部分） — verify: `grep -rn "framecut-offline\|douxc512" index.html */index.html` 无输出；每页 `__SITE_URL__` 出现次数覆盖上述五类位置
- [x] 2.2 `public/sitemap.xml` 的六条 `<loc>` 与 `public/robots.txt` 的 Sitemap 声明改写为 `__SITE_URL__` 占位符 — verify: `grep -rn "framecut-offline\|douxc512" public/` 无输出

## 3. 构建期注入（打包流程内）

- [x] 3.1 在 `vite.config.ts` 新增自定义插件，实现 `transformIndexHtml` 把占位符替换为解析后的站点 URL — verify: `pnpm build` 后 `grep -c "__SITE_URL__" dist/index.html dist/*/index.html` 全为 0，且共 6 个入口的 canonical 均为 `https://offline-tools.colors-cc.top/<path>/`
- [x] 3.2 确认 `transformIndexHtml` 在六入口多入口构建中对每个入口都触发；若某个入口未触发，记录现象并在 3.3 的兜底逻辑中覆盖 — verify: 逐个检查六个产物 HTML 的 canonical，均无残留占位符
- [x] 3.3 同一插件实现 `closeBundle`：遍历产物目录，对内容含占位符的文本文件做替换，覆盖 `public/` 复制而来的 `sitemap.xml` 与 `robots.txt` — verify: `pnpm build` 后 `grep -rc "__SITE_URL__" dist/sitemap.xml dist/robots.txt` 为 0，且 `dist/sitemap.xml` 六条 `<loc>` 均为新 host
- [x] 3.4 确保该插件在 `plugins` 数组中的位置早于 `VitePWA(...)`，使 `robots.txt` 的替换发生在预缓存内容修订号计算之前 — verify: 比对 `dist/sw.js` 中 `robots.txt` 的 `revision` 与 `md5 -q dist/robots.txt`，两者一致

## 4. 测试

- [x] 4.1 修订 `tests/build-output.test.mjs` 中把 A4 页 canonical（约第 82 行）与 og:url（约第 88 行）钉在旧域名上的两处断言，改为与 `src/lib/site.ts` 的配置值比较，消除"断言旧域名导致假绿" — verify: 替换完成后该测试通过，且 `grep -n "framecut-offline" tests/` 仅剩 4.2 的废弃清单
- [x] 4.2 新增 `tests/site-url-embed.test.mjs`：从 `src/lib/site.ts` 导入配置值，断言产物中所有绝对 URL 的 host 唯一且等于配置值、无残留 `__SITE_URL__` 占位符、不出现废弃 host 清单（字面量列表，当前含 `framecut-offline.douxc512.chatgpt.site`）中的任何 host — verify: 该测试文件通过；接入 `package.json` 的 `test` 脚本
- [x] 4.3 把新测试文件加入 `package.json` 的 `test` 脚本文件列表 — verify: `pnpm test` 完整通过（其内部先执行 `pnpm build`）

## 5. 文档同步

- [x] 5.1 `project-map.md` 第 5 行的部署地址陈述改为描述单一来源（站点 URL 由 `src/lib/site.ts` 定义），不再写入具体域名副本 — verify: `grep -n "framecut-offline\|douxc512" project-map.md` 无输出
- [x] 5.2 全仓库最终确认无旧域名残留（`dist/` 与 `node_modules/` 除外） — verify: `grep -rn "framecut-offline\|douxc512" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git` 仅在 `tests/site-url-embed.test.mjs` 的废弃清单中出现

## 6. 集成验证与部署

- [x] 6.1 本地完整验证：`pnpm test` 通过；人工检查 `dist/` 中六个 HTML、`sitemap.xml`、`robots.txt` 的 host 全部正确 — verify: 测试输出全绿，且 `dist/` 内 host 唯一性可 grep 复核
- [x] 6.2 确认 EdgeOne 项目设置的构建命令为 `pnpm build`（而非 `vite build` 之类跳过前置步骤的命令），以保证 PNG 压缩 Worker 仍被生成 — verify: 控制台配置确认为 `pnpm build`；本地 `pnpm build` 后 `dist/assets/image-compress-worker.js` 存在且为 663,411 字节
- [x] 6.3 push 到 main 触发部署并线上核验 — verify: `768ae75..da7c4ae main -> main` 推送后 EdgeOne 部署完成（线上 `main-B0GJnFyS.css` / `main-BYyMUJyj.js` 与本地构建逐名一致，`Last-Modified: 2026-09-17 14:24:48 GMT`）。线上实测:六个页面 canonical 全部为 `https://offline-tools.colors-cc.top/<path>/`；A4 页 og:url 与 og:image 正确；`/sitemap.xml` 六条 `<loc>` 全部新 host；`/robots.txt` 的 Sitemap 声明正确；**六个页面 + sitemap + robots 的旧域名残留数为 0**
- [x] 6.4 线上确认 Worker — verify: `/assets/image-compress-worker.js` 返回 200、体积 663411 字节，与本地 `build:image-codecs` 产物一致，域名改动未影响 Worker 生成链路
- [x] 6.5 向搜索引擎提交新域名 sitemap — verify: 用户于 2026-09-17 在 Google 完成提交；远程可核验的印证为 DNS TXT 记录 `google-site-verification=VVY1VUGPJOwe7HpXz3b-JhQdyrie3Mes-L5-6lxi2HQ`（Google 颁发的站点所有权令牌，表明验证步骤已完成）。**提交动作本身在 Search Console 内，无法远程确认**，以用户确认为准。存量索引信号的消解需等待搜索引擎重新抓取，不在本 change 范围内
- [x] 6.6 `.agents/` 目录处置 — verify: 已在 `c03b552` 纳入版本管理（7 个文件，确认无本机路径/凭据耦合）。附带发现:`.claude/settings.local.json` 由全局 gitignore（`~/.config/git/ignore` 的 `**/.claude/settings.local.json`）排除，从来不需要项目级处理
