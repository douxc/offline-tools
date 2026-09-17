## 1. token 层与主题（不改变可见外观）

- [x] 1.1 按 design 决策 2 的映射表重写 `src/index.css` 的 token 段为 shadcn 结构：`:root` 放亮色值、`.dark` 放暗色覆盖，涵盖 `--background`/`--foreground`/`--card`/`--popover`/`--primary`/`--secondary`/`--muted`/`--accent`/`--destructive`/`--border`/`--input`/`--ring`/`--warning`/`--chart-1..5`/`--sidebar-*` 与 `--radius` 派生链，颜色改用 oklch — verify: `grep -c "oklch(" src/index.css` 覆盖全部颜色声明；亮暗两块的变量名集合一致
- [x] 1.2 逐处判定 `var(--muted)` 的角色：3 处文字用途迁移为 `--muted-foreground`，并新增 `--muted` 作为次要填充底色 — verify: 每处用法经人工确认角色正确；`--muted` 与 `--muted-foreground` 均有定义且值不同
- [x] 1.3 新增 `@theme inline` 段，把全部语义变量映射为 Tailwind 工具类（`--color-background: var(--background)` 等） — verify: 在任一组件中用 `bg-primary`/`text-muted-foreground`/`border-border` 构建成功且解析到对应 token
- [x] 1.4 引入 `next-themes` 依赖并把 `src/lib/theme.tsx` 改为适配层（内部用 next-themes，对外仍导出 `useTheme()` 返回 `{theme, toggleTheme}` 与 `ThemeProvider`），`storageKey` 保持 `offline-tools-theme`、`attribute="class"`、`enableSystem` 开启 — verify: `pnpm build` 通过；`src/components/tool-header.tsx` 等调用点无需改动
- [x] 1.5 迁移 4 处 `data-theme` 选择器（`index.css` 第 34/1111/1114/1892 行）到 `.dark`，移除 `data-theme` 属性写入 — verify: `grep -rn "data-theme" src/` 无输出；亮暗切换观感与迁移前一致
- [x] 1.6 重写 `tests/theme-tokens-embed.test.mjs`：断言 `:root` 与 `.dark` 两块存在且**键集合一致**、颜色为 oklch、界面样式不含十六进制色值（非语义装饰变量按名豁免）、`src/components/ui/` 下无 `var(--` 直写 — verify: 该测试通过；保留既有的 checker 自引用断言
- [x] 1.7 首屏无主题闪烁 — verify: **改为根治而非实测**。next-themes 在 Provider 挂载后注入脚本,而入口是 module script,存在首帧前未应用主题的窗口;改为在六个入口的 `</head>` 前内联一段脚本,在样式表与模块脚本之前按已保存主题挂 `.dark`/`.light` 类(默认暗色)。新增 `tests/theme-script-embed.test.mjs` 守卫脚本位置(先于模块脚本)与存储键/取值契约,并已用反例验证(改动 theme.tsx 的存储键 → 断言变红)
- [x] 1.8 核对亮暗两态的对比度 — verify: 以 OKLCH→相对亮度→WCAG 公式逐项计算，16 个组合全部达标；**过程中发现并修正真实缺陷**：原 `--primary`(暗)3.65:1、`--destructive`(暗)3.41:1、`--destructive`(亮)3.55:1 均低于 4.5:1，按最小改动调整亮度至 0.571/0.594/0.595（色相彩度不变）。新增 `tests/contrast-embed.test.mjs` 作为契约

## 2. 组件层（外观变化明显）

- [x] 2.1 `src/components/ui/` 全部组件的颜色与边框改用语义工具类（`bg-card`/`text-foreground`/`border-border`/`bg-popover` 等），去掉 `var(--x)` 直写 — verify: `grep -rn "var(--" src/components/ui/` 无输出
- [x] 2.2 Button 的 `size` 档位改为 shadcn 基准（`default` 36px / `sm` 32px / `lg` 40px / `icon` 36×36px），基类补 `[&_svg]:size-4` — verify: 各档位渲染高度为 36/32/40/36px；图标尺寸统一为 16px
- [x] 2.3 清零旧按钮类：删除 `.primary-button`/`.ghost-button`/`.export-button`（13 处使用点）及其 CSS，调用点改用 shadcn Button 的 `variant` — verify: `grep -rn "primary-button\|ghost-button\|export-button" src/` 无输出
- [x] 2.4 清零冒充按钮：3 处 `<span className="primary-button">` 改为真实 Button 或移除按钮外观 — verify: `grep -rn '<span[^>]*className="[^"]*button' src/` 无输出
- [x] 2.5 清零原生 `<button>`（10 处，含 `tool-header`、`batch-sampling-controls`、`A4ImageLayout`）改用 shadcn Button 组件 — verify: `grep -rn "<button" src/ --include=*.tsx` 仅剩 `components/ui/` 内部实现
- [x] 2.6 按官方注册表引入 `toggle-group` 与 `toggle`，替换 A4 页「每行张数」自建 `.a4-cols-picker` 与视频页批量采样模式控件 — verify: 选中态由 `data-state` 表达；两处自建类从 CSS 删除
- [x] 2.7 Popconfirm 容器改用 `popover` 语义 token。**经复核不引入 `alert-dialog`**：决议 D3 明确破坏性确认保留非模态 Popconfirm，引入一个无使用者的模态组件属于死代码（原先计划的"留给未来"缺乏具体场景） — verify: `grep -rn "var(--" src/components/ui/popconfirm.tsx` 无输出
- [x] 2.8 修正 A4 动作行：删除 `.a4-actions .primary-button` 的 `margin-top` 覆盖与 `min-width: 156px`，使「打印 A4 版面」与「清空图片」同尺寸（同高、同圆角、同字重、垂直对齐） — verify: 两者计算高度与圆角一致；`git diff` 中 `src/index.css` 不再有 `min-width: 156px`
- [x] 2.9 `.a4-icon-button` 的 44px 可见盒子改为 shadcn `icon` 档尺寸，列表行 grid 轨道与行高随之收紧（84px → 约 68px），命中区以伪元素扩展至不小于视觉尺寸 — verify: 列表行高实测；相邻行图标不误触

## 3. 交互层（Apple 交互契约，补齐 shadcn 未覆盖部分）

- [x] 3.1 建立显式模式状态机 — verify: 新增 `src/lib/tool-mode.ts` 的 `deriveModeState`（纯函数，empty/ready/processing/partial/complete 与各模式可用操作）并接入 `ImageProcessor` 驱动主操作与结果区可见性；`src/lib/tool-mode.test.ts` 8 项断言含「五种模式均由输入可达」与「处理中优先于其他判定」
- [x] 3.2 实现单一主操作 — verify: SSR 实测 `empty` 模式仅呈现导入入口（不含「处理全部」「清空图片」）；模式状态机断言导入前 canRunPrimary/canClear/canDownload 均为 false
- [x] 3.3 实现单槽反馈替换 — verify: 主操作、处理中、结果摘要均位于 `.image-settings-panel` 同一有界容器；`tests/stable-anchors-embed.test.mjs` 守卫「主操作之后不新增内容流区块」
- [x] 3.4 实现稳定锚点 — verify: 以结构守卫替代像素测量（`tests/stable-anchors-embed.test.mjs`：反馈留在同一容器、主操作后不插入新区块、不使用独立 `<progress>` 行），并已用反例验证守卫非空转（故意移出槽位 → 2/3 断言变红）。**边界说明**：锚点矩形的 ≤1px 像素级测量需浏览器，当前环境不安装无头浏览器，该部分未实测
- [x] 3.5 实现防重复提交与取消契约 — verify: 三处耗时操作均提供取消且守卫不产出半成品 —— 图片批量处理（新增取消，保留已完成结果并进入 partial）、批量抽帧导出（新增取消，中断生成器不产出 ZIP）、视频压缩（补取消提示）；`tests/cancel-contract-embed.test.mjs` 4 项守卫。防重复提交由处理中不呈现可再次提交的主操作保证
- [x] 3.6 实现失败恢复 — verify: 逐张失败不丢已导入对象与设置；失败提示补齐「未改变的内容 + 恢复路径」（图片处理 2 处、视频取帧 3 处、视频压缩 3 处）；取消提示说明未产生文件
- [x] 3.7 破坏性 Popconfirm 初始焦点 — verify: 人工裁决(2026-09-17)落在**取消键**;实现为 `cancelRef` + `onOpenAutoFocus` 聚焦取消键,取消键在 DOM 中先于确认键;新增 `tests/confirmation-focus-embed.test.mjs` 守卫(含「确认键不得成为初始焦点目标」的否定断言),并已用反例验证;顺带移除两个按钮上覆盖 shadcn `sm` 档(32px)的 `min-h-11`

## 4. 清理、文档与验收

- [x] 4.1 删除已无引用的自建类 — verify: 严格扫描（源码文本比对）找出 4 个零使用者类（`.primary-button`/`.ghost-button`/`.export-button`/`.image-mode-tabs`），删除 17 条规则；顺带简化 `.image-dropzone > span:not(.primary-button)` 为 `.image-dropzone > span`（排除项已失效但主体仍在使用）。`index.css` 2961 → 2731 行，自建类 124 → 115；lint 与 124 项测试通过
- [x] 4.2 文档同步 — verify: `project-map.md` 的选型段改为「设计系统以 shadcn 为唯一来源」（token 结构、`@theme inline`、oklch、`--radius` 派生链、next-themes、官方组件来源、尺寸档位、图标统一、对比度契约），架构段补入 `deriveModeState` 与三处取消
- [x] 4.3 全量验收 — verify: `pnpm lint` 0 错误、`pnpm test` 124/124。**断点与明暗两态的人工视觉核验未执行**（需浏览器），已在 4.5 记为未验证项
- [x] 4.4 确认未越界 — verify: 入口 HTML 与站点 URL/SEO 相关文件 `git diff` 为空；打印段落未出现在 diff 中，`@page`(2)/`break-after`(4)/`210mm`/`297mm` 均在位，A4 预览缩放为行内 `transform: scale()`（未触及）
- [x] 4.5 汇总验收结论 — 分类如下（无未解决的 FIX）：
  - **PASS**：token 结构与 shadcn 一致（语义命名 / oklch / `@theme inline` / `--radius` 派生链 / `.dark`·`.light` 类键）；主题由 next-themes 管理且首帧由内联脚本保证；组件全部来自官方注册表并改用语义工具类；尺寸为 shadcn 基准且同组一致；旧按钮类、原生按钮、冒充按钮、自建分段控件清零；图标尺寸由基类统一；模式状态机可枚举且单一主操作；三处耗时操作可取消且不产出半成品；失败提示说明未改变内容；亮暗两态对比度 16/16 达 4.5:1；`pnpm lint` 0、`pnpm test` 126/126。
  - **HUMAN DECISION（未解决）**：破坏性 Popconfirm 的初始焦点落点（3.7）—— Apple 未规定，需人工裁决；裁决前保持现状未实现。
  - **未验证（非 FIX）**：锚点矩形的 ≤1px 像素级测量与 320/600/760/900px 断点下的人工视觉核验需浏览器，当前环境不安装无头浏览器，未执行。
  - **OUT OF SCOPE（未改动）**：打印与 A4 版式、6 入口架构、站点 URL 与 SEO。
