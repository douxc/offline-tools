## 1. 依赖与数据层

- [x] 1.1 安装 `@radix-ui/react-tabs`、`@radix-ui/react-popover`（pnpm add，版本与现有 radix 同代 2.x）— verify: `pnpm install` 成功、`package.json` 出现依赖
- [x] 1.2 `tool-navigation.ts` 增加 `TOOL_GROUPS`（video/image 两组，含 label、routes、defaultRoute）与 `toolGroupForRoute()`，并新增 `src/lib/tool-navigation.test.ts`（分组归属、默认跳转、home 无组）— verify: `node --import tsx --test src/lib/tool-navigation.test.ts` 通过

## 2. 导航与二级 tab（shadcn）

- [x] 2.1 新增 `src/components/ui/tabs.tsx`（shadcn Tabs，Radix）— verify: `tsc -b` 与 eslint 通过
- [x] 2.2 新增 `src/components/tool-tabs.tsx`：Tab 列表 = 当前分组工具路由，`Tabs value=当前路由`，`TabsTrigger asChild` 包 `<a href onClick={navigateToTool}>` — verify: renderToString 输出含 `role="tab"`、正确 `href`、当前项 `aria-selected="true"`（写 `tool-tabs.test.tsx`）
- [x] 2.3 `ToolHeader` 改为分组导航：两个分组链接（视频→/video-frame/、图片→/image-compress/），当前组 `aria-current`，首页无当前组；删除工具级链接 — verify: `tool-header` 相关 SSR 断言 + 手测 6 页导航
- [x] 2.4 视频两页接入 `ToolTabs`（App.tsx / video-compressor.tsx，二级 tab 出现在编辑器区顶部）— verify: 手测 `/video-frame/` ↔ `/video-compress/` 切换与中键新标签
- [x] 2.5 图片三页用 `ToolTabs` 替换 `.image-mode-tabs` 与 `.a4-mode-tabs`（删对应 CSS，保留当前分组语义）— verify: 三路由下 tab 选中态正确、`A4ImageLayout.test.tsx`/`text-overlay-panel.test.tsx` 等现有测试通过

## 3. 风险操作二次确认

- [x] 3.1 新增 `src/components/ui/popconfirm.tsx`（Radix Popover：说明 + 取消/确认，Escape/外点关闭，焦点回触发按钮）；`button.tsx` 新增 `destructive` variant（`--danger`）— verify: SSR 渲染 trigger 含 `aria-haspopup`/`aria-expanded`，tsc 通过（`popconfirm.test.tsx`）
- [x] 3.2 `ImageProcessor` 清空图片接入 Popconfirm（文案含数量 N 张）— verify: 确认前列表不变，确认后清空；取消/Escape 不执行（手测 + 现有测试更新）
- [x] 3.3 `A4ImageLayout` 清空接入 Popconfirm，删除 `pendingClear` 两段式状态与文案 — verify: 不再出现「确认清空？」按钮态；`A4ImageLayout.test.tsx` 更新并跑通
- [x] 3.4 视频取帧/视频压缩「重新选择」接入 Popconfirm — verify: 确认前视频与播放位置不变，确认后清空；手测焦点回归
- [x] 3.5 更新 `package.json` test script 加入新测试文件 — verify: `pnpm test` 全绿

## 4. 反馈统一（sonner）+ 压缩缺陷修复

- [x] 4.1 `App.tsx`/`video-compressor.tsx` 删除 `error` state 与自绘 `.error-toast`，错误统一 `toast.error`（含成功数量/原因信息）— verify: 触发无法播放/无法编码等错误时出现 sonner toast，页面无自绘错误条；删除 `index.css` 中 `.error-toast` 样式
- [x] 4.2 视频压缩修复：`discardRef` 标记 + `cancelCompress` 先行置位；`onstop` 丢弃分片不下载；卸载 cleanup 停止 recorder 并置位 — verify: 压缩中点「停止压缩」无文件下载、无半成品 result；压缩中切走路由再回来无残留录制
- [x] 4.3 批量抽帧完成加 `toast.success`（N 张 ZIP）；图片批量完成提示保持 — verify: 批量导出后出现完成 toast，按钮瞬时成功态仍工作

## 5. 工具链接 / 页脚 / 结构化数据

- [x] 5.1 新增 `src/components/tool-links.tsx`（5 工具全量、排除当前页、href 来自 TOOL_PATHS），`ToolSeoContent` 改用并新增 `a4` 文案，A4 页补渲染 `ToolSeoContent tool="a4"` — verify: 视频取帧页相关工具含视频压缩；A4 页出现使用说明区块（`tool-links.test.tsx`、SSR 断言）
- [x] 5.2 新增 `src/components/license-footer.tsx`（GPL 声明 + 第三方许可 + 对应源代码），接入 6 页，删除 ToolHome/ImageProcessor 内联页脚 — verify: 6 页 SSR/手测页脚一致，打印时隐藏（A4 打印样例行不输出）
- [x] 5.3 `seo.ts` home JSON-LD ItemList 补全 5 工具；`index.html` 内联 JSON-LD 与 `<noscript>` 导航补全 5 工具 — verify: 新增 `seo.test.ts` 断言首页 JSON-LD 含 5 条且与 TOOL_PATHS 一致；grep index.html 无遗漏
- [x] 5.4 更新 `project-map.md`/`README.md`（导航分组、公共组件、依赖）— verify: 文档与实现一致（段落复核）

## 6. 视觉体系统一

- [x] 6.1 文字≥12px：`image-list-meta small`/`timeline-labels`/`a4-pager`/`a4-hint`/`license-footer`/`icp-footer`/`drop-card small` 等提升；列表元信息去除 nowrap+ellipsis — verify: 所有面向用户文字 ≥12px（grep font-size 检查），2× 缩放不截断
- [x] 6.2 颜色变量化：硬编码灰替换为语义变量；删除因硬编码灰产生的 `[data-theme="light"]` 覆盖（保留 color-mix/状态色等必要项） — verify: 亮/暗主题手测 6 页无暗色残留块、无漏改色（grep 色值清单复核）
- [x] 6.3 圆角 token 化 + 按钮组件化：`export-button`/`ghost-button`/`.primary-button`（交互处）迁移 `Button` variants；圆角只留 `--radius-*` — verify: 按钮 hover/active 一致，SSR/手测；无 `rounded-[Npx]` 残留
- [x] 6.4 命中区：图标按钮（remove、a4-icon、pager、theme-toggle）命中区 ≥44px；Slider 根高 ≥44px、拇指 20px — verify: 移动端宽度下手测命中；列表行无重叠
- [x] 6.5 回归：`pnpm test` 全绿 + `pnpm build` 成功 + dev server 人工矩阵（6 页 × 亮暗 × 桌面/375px × 200% 文字） — verify: 矩阵无布局错乱、控制台无错误

## 7. 集成验证

- [x] 7.1 全流程走查：首页→各工具页（导航/tab/确认/反馈/页脚）→ A4 打印预览 → 返回首页，确认 6 页行为与 specs 一致 — verify: 对照 5 份 spec 逐条勾核并记录
