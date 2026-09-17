## Context

见 `proposal.md` 的 Why。设计受以下事实约束：

- 仓库存在两套并行设计系统。`src/components/ui/` 已有 7 个 shadcn 组件（button/card/select/slider/tabs/popconfirm/sonner），形态已是现行 shadcn（`data-slot`、cva、Radix 原语），但样式写成"工具类 + 手写 `var()`"。`src/index.css` 现有 2961 行、124 个自建类选择器，其中 `.primary-button`/`.ghost-button`/`.export-button` 在 13 处覆盖 shadcn Button 外观，另有 10 处原生 `<button>` 与 3 处 `<span>` 冒充按钮。
- 主题实现已是双写：`src/lib/theme.tsx` 同时设置 `root.dataset.theme` 与 `root.classList.toggle("dark", ...)`，但 CSS 键在 `[data-theme="light"]` 上。`data-theme` 的消费者只有 4 处：`index.css` 第 34/1111/1114/1892 行，以及 `tests/theme-tokens-embed.test.mjs` 的一条断言。
- shadcn 官方 Button 的能力边界已实测确认：`variant` 有 6 档，`size` 有 4 档（`default` h-9 / `sm` h-8 / `lg` h-10 / `icon` h-9 w-9），基类含 `focus-visible:ring-1 ring-ring`、`disabled:opacity-50`、`[&_svg]:size-4`；**不含** loading/busy/aria-busy 语义。因此"进行中、成功、失败、防重复、取消"这些交互完全没有 shadcn 规范可依 —— 这正是引入 Apple HIG 的边界。
- 应用同时声明移动端支持：`body { min-width: 320px }`、8 个窄视口断点（600/760/900/1150px）、`width=device-width` 视口、PWA `display: standalone`。人类裁决以桌面指针操作为主，移动端为次要目标。

## Goals / Non-Goals

**Goals:**

- 设计系统单点收敛到 shadcn：token、组件来源、尺寸档位、主题机制均以官方注册表与官方主题文档为准，项目不再保留第二套颜色或尺寸体系。
- 交互要求收敛到 Apple HIG：把 shadcn 未覆盖的交互层面（模式状态模型、状态切换的几何稳定、异步单槽反馈、取消与失败恢复）固化为可验证规格。
- 旧体系清零：自建按钮外观、原生按钮、冒充按钮、散落图标尺寸、硬编码颜色在本次一并移除，不留中间态。
- 收敛过程可分段验证、可回滚：每阶段结束时构建与测试均通过。

**Non-Goals:**

- 不改动打印与 A4 版式（`@page`、`break-after`、210mm 物理尺寸、`transform: scale` 预览、`.no-print` 约定）。shadcn 与 Apple 均无对应规范。
- 不改动 6 入口多页面架构、站点 URL/SEO、图片与视频处理管线的功能行为。
- 不引入 SSR/SSG。token 定义仍在 CSS，`@theme inline` 只做映射。
- 不追求移动端 44pt 触控合规：按人类裁决接受为次要目标，仅在规格中记录该取舍。

## Decisions

### 决策 1：范围与尺寸口径（人类裁决，2026-09-17）

用户裁决：本项目以 web/PC 与鼠标点击为主，**页面精致优先于可操作性**；Apple 规范仅取"交互要求"，设计规范统一使用 shadcn。

落地含义：尺寸采用 shadcn 基准（`default` 36px / `sm` 32px / `lg` 40px / `icon` 36×36px），不套用 44px 可见盒子；`visual-system` 的"默认 44px、大 52px、小 36px"档位取消；44px 命中区要求改为"命中区不小于视觉尺寸，且不以放大可见盒子实现"。

**残余影响（记录在案）**：应用声明了移动端支持，36px 图标按钮低于 Apple 对触控的 44pt 建议。这是被接受的取舍，不转为实现约束。

考虑过的替代方案：

- **可见 36px + 伪元素扩到 44px 命中区。** 兼得 shadcn 观感与 Apple 触控建议，但需要为每个图标控件维护扩展层，且裁决明确以精致优先，故不采用（伪元素扩展仍作为可选手段保留在规格中，用于满足"命中区不小于视觉尺寸"）。
- **设 40px 中间值。** 无权威依据，且会再次产生"项目自有档位"这一本次要消除的东西。

### 决策 2：token 结构对齐 shadcn，`--muted` 语义按角色迁移

采用 shadcn 官方主题文档的 token 清单与 `@theme inline` 映射方式，颜色值改用 oklch，圆角收敛为单一 `--radius` 派生链。

映射表（项目当前 21 个自定义 token → shadcn 语义 token）：

| 现有 token | 现用途 | 目标 token | 说明 |
|---|---|---|---|
| `--page` | 页面底色 | `--background` | |
| `--ink` | 主文字 | `--foreground` | |
| `--muted` | **次要文字** | `--muted-foreground` | 角色是前景色 |
| — | — | `--muted` | **新增**：次要填充底色（shadcn 语义） |
| `--line` | 分隔线与描边 | `--border` | |
| `--panel` | 卡片底色 | `--card` | 配 `--card-foreground` |
| `--panel-raised` | 浮层底色 | `--popover` | 配 `--popover-foreground` |
| `--surface-hover` | 悬停底色 | `--accent` | 配 `--accent-foreground` |
| `--control-bg` | 输入控件底色 | `--secondary` 或 `--input` | 按控件角色取值 |
| `--control-border` | 控件描边 | `--input` | |
| `--control-text` | 控件文字 | `--secondary-foreground` | |
| `--control-border-hover` | 控件悬停描边 | 由 `--ring` 表达 | 不新增 token |
| `--acid` | 强调色 | `--primary` | 配 `--primary-foreground` |
| `--acid-ink` | 强调色上的文字 | `--primary-foreground` | |
| `--danger` | 危险色 | `--destructive` | 配 `--destructive-foreground` |
| `--success` | 成功色 | `--chart-2` 或保留为领域语义 | 见风险 5 |
| `--success-ink` | 成功色上的文字 | 同上 | |
| `--slider-track` | 滑块轨道 | `--secondary` 或 `--border` | 不新增 token |
| `--soft-text` | 更弱的辅助文字 | `--muted-foreground` | 与 `--muted` 合并 |
| `--page-glow` | 背景光晕 | 删除或改用 `--accent` | 非语义装饰 |
| `--checker-a` / `--checker-b` | 透明度棋盘格 | **保留本地变量** | 非语义装饰，见风险 4 |

**`--muted` 是本次最容易搞反的一处**：项目当前 `--muted` 存的是"次要文字颜色"（前景角色），而 shadcn 的 `--muted` 是"次要填充底色"（背景角色），文字角色叫 `--muted-foreground`。代码里 3 处 `var(--muted)` 用于文字，迁移时必须落到 `--muted-foreground`；同时新增 `--muted` 作为填充色。若机械改名，会把文字色当成底色，且因两者都是灰阶而不易被肉眼发现。

### 决策 3：主题机制采用 next-themes 与 `.dark` 约定（人类裁决：遵循 shadcn 方案）

引入 `next-themes`，以 `.dark` 为键：`:root` 放亮色值、`.dark` 放暗色覆盖。移除自研 `ThemeProvider` 与 `data-theme` 属性。

调用点收敛方式：`src/lib/theme.tsx` 改为薄适配层，内部使用 next-themes 的 `useTheme()`，对外继续导出 `useTheme()`（返回 `{ theme, toggleTheme }`）与 `ThemeProvider`。这样 `tool-header.tsx` 等调用点与 `main.tsx` 的结构改动最小，同时主题状态由 next-themes 管理。

`storageKey` 保持现有的 `offline-tools-theme` 以兼容既有用户选择；`attribute="class"`；`enableSystem` 开启以跟随系统偏好。

考虑过的替代方案：

- **只改 CSS 键、保留自研 Provider。** 零新增依赖，但人类裁决为"遵循 shadcn 方案"，且 next-themes 原生支持系统偏好变化监听（现自研实现未监听 `matchMedia` 的 change 事件）与防闪烁注入，故采用官方方案。
- **改用 `.dark` 但不引入依赖，自行补 `matchMedia` 监听。** 与裁决不符。

### 决策 4：token 契约写成测试，禁止 40 处硬编码回流

`tests/theme-tokens-embed.test.mjs` 的 `[data-theme="light"]` 断言改为校验 `:root` 与 `.dark` 两个块，并断言两者**键集合一致**（防止只给一个主题加 token）；断言界面样式不出现十六进制色值（非语义装饰变量除外）；断言 `src/components/ui/` 下不出现 `var(--` 直写。

现有 `checker 变量不得自引用` 断言保留 —— 它防护的是 `ed4917f` 那次"机械替换把值替换成自身"的真实缺陷。

### 决策 5：组件来源以官方注册表为准，新增 3 个组件

按官方注册表引入 `toggle-group`、`toggle`、`alert-dialog`。`ToggleGroup`/`Toggle` 替换 A4 页「每行张数」与视频页批量采样模式的自建分段控件；`AlertDialog` 按需引入但不用于破坏性确认（决策 6），保留给未来真正不可逆的场景。

`Popconfirm` 保留为项目自建组件：shadcn 注册表没有对应项（其 `AlertDialog` 是模态，`Popover` 无确认语义），属于"注册表没有对应项的领域专用界面"。

### 决策 6：破坏性确认保持非模态 Popconfirm（人类裁决：D3）

保留 Radix Popover 实现的非模态确认，不改为模态 `AlertDialog`。依据 Apple 权威顺序第 1 条"保留已批准的产品行为与现有 spec"，且该动作属"用户重新导入即可恢复"，不属 Apple Alerts 所指的不可逆且需立即注意的决策。

规格补入：确认控件使用 `destructive` variant（现状已符合），容器使用 `popover` 语义 token，并新增"保持非模态"场景。

### 决策 7：打印与 A4 版式不纳入规范收敛

`@media print` 段落（约 114 行、22 个类选择器）、`@page`、`break-after`、A4 物理尺寸与预览缩放保留现状。这些是印刷/物理版式领域，shadcn 与 Apple 均无规范；重写只会降低可读性。它们在本次唯一需要满足的约束是：界面态颜色取自同一套 token。

## Risks / Trade-offs

- [尺寸整体缩小导致全站布局位移，窄视口可能出现文字换行或溢出] → 分阶段实施，每阶段在 320/600/760/900px 断点下检查；现有 SSR 结构测试作为回归护栏。
- [`--muted` 语义迁移时前景/背景搞反，且因同为灰阶不易肉眼发现] → 迁移时对每处 `var(--muted)` 用法逐个判定角色；新增 token 契约测试断言 `:root` 与 `.dark` 键集合一致。
- [40 处硬编码颜色逐处迁移易遗漏] → 由测试断言"界面样式不含十六进制色值"守住，而非依赖人工检查。
- [`.vinext` 字体残留已被清理，但 `--checker-a/b` 这类非语义装饰与新规范冲突] → 规格明确允许非语义装饰保留本地变量；测试的色值断言按变量名豁免而非按值豁免。
- [`--success` 在 shadcn token 集中没有对应语义（其 `--chart-2` 非语义）] → 处理成功态保留为项目领域语义变量并显式记录，不伪装成 shadcn token；`warning`/`warning-foreground` 为 shadcn 现行集合中的成员，可直接采用。
- [next-themes 在纯客户端渲染下可能出现首屏主题闪烁] → **实施中改为根治**：next-themes 的内联脚本在 Provider 挂载后才注入，而入口是 module script，理论上存在首帧前未应用主题的窗口。改为在六个入口的 `</head>` 前内联一段脚本，在样式表与模块脚本之前按已保存主题挂 ` .dark`/`.light` 类。该脚本独立于 React，因此与 `src/lib/theme.tsx` 的存储键/取值形成隐式耦合 —— 由 `tests/theme-script-embed.test.mjs` 守卫（脚本必须先于模块脚本；存储键与 `THEME_STORAGE_KEY` 一致；`value` 映射为 light/dark；默认暗色）。
- [现有测试含尺寸断言，会与新基准冲突] → 这是必要代价，随实现同步更新；不保留为兼容旧尺寸而设的例外。

## Migration Plan

分四阶段，每阶段结束构建与测试均通过，可独立回滚：

1. **token 层与主题** —— 重写 `index.css` 的 token 段为 shadcn 结构 + `@theme inline`；引入 `next-themes`；`src/lib/theme.tsx` 改为适配层；迁移 4 处 `data-theme` 选择器；更新 `theme-tokens-embed.test.mjs`。此阶段**不改变可见外观**（token 值保持等价），是纯结构迁移。
2. **组件层** —— `src/components/ui/*` 改用语义工具类与 shadcn 尺寸档位；删除旧按钮类（13 处）、原生按钮（10 处）、冒充按钮（3 处）；图标尺寸收敛为基类 `[&_svg]:size-4`；引入 `ToggleGroup`/`Toggle` 替换自建分段控件。此阶段**外观变化明显**。
3. **交互层** —— 按 `interaction-modes` 规格实现：单一主操作、显式模式状态机、稳定锚点、单槽反馈、取消与失败恢复。
4. **清理与文档** —— 删除 `index.css` 中已无引用的自建类；`project-map.md` 的样式/组件段落同步；确认无 `var(--` 直写残留。

回滚策略：每阶段独立提交，revert 对应提交即可回到上一稳定态。无数据迁移、无不可逆副作用。

## Open Questions

- 破坏性 Popconfirm 打开时的初始焦点：现规格要求"焦点移入框内可操作元素"，但未指明是确认键还是取消键。Apple Buttons 一方面要求为最可能的动作提供 primary 角色（并响应 Return），另一方面明确要求"不要给破坏性动作分配 primary 角色"，两侧都未直接规定破坏性确认框的默认焦点。倾向落到**取消键**（避免误按 Return 触发破坏），但这需要人工确认；在确认前保持现状（不改变焦点落点），受影响任务不标记完成。

## 决策证据表

规范依据（均为官方来源，访问日期 2026-09-17）：

- Apple [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)：按钮需 ≥44×44pt 命中区；用样式而非尺寸区分主次（同尺寸的近邻按钮尺寸不同会造成困惑）；破坏性动作使用系统红；**不得**为破坏性动作分配 primary 角色。
- Apple [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)：iOS/iPadOS 默认控件 44×44pt、下限 28×28pt，macOS 默认 28×28pt、下限 20×20pt；控件间距建议带边框 12pt、无边框 24pt；文字对比度 ≤17pt 需 ≥4.5:1；支持放大文字至少 200%；同时支持 Dark Mode 时须在两种外观下检查对比度。
- shadcn [Button 注册表](https://ui.shadcn.com/r/styles/new-york/button.json) 与[主题文档](https://ui.shadcn.com/docs/theming)：`size` 四档 `default` h-9 / `sm` h-8 / `lg` h-10 / `icon` h-9 w-9；`variant` 六档；基类含 `focus-visible:ring-1 ring-ring`、`disabled:opacity-50`、`[&_svg]:size-4`；token 为 33 个语义变量 + `@theme inline` 映射；暗色以 `.dark` 为键。

| Decision | User goal and context | Apple source and conclusion | Apple gap | Google source and conclusion | Chosen behavior | Verification |
|---|---|---|---|---|---|---|
| D1 命中区尺寸 | 桌面指针为主，追求页面精致 | Buttons：≥44×44pt 命中区；Accessibility：iOS 默认 44×44pt、macOS 28×28pt | Apple 未规定 Web 桌面指针场景的最小命中区数值；44pt 面向触控 | 不适用（非 Android 系统契约） | 采用 shadcn `icon` 36×36px；命中区不小于视觉尺寸且不以放大可见盒子实现 | 视觉回归 + `visual-system` 命中区场景 |
| D2 尺寸档位 | 同一区域按钮层级清晰 | Buttons：用样式而非尺寸区分主次；同组尺寸不一致会造成困惑 | Apple 未规定具体档位数值 | 不适用 | 采用 shadcn 四档（36/32/40/36），层级由 `variant` 表达 | 同组按钮尺寸一致性检查 |
| D3 破坏性确认形态 | 清空/重新选择需防误触 | Buttons：破坏性用系统红、不得给破坏性动作 primary 角色。Alerts：需立即注意的决策用模态 | Apple 未规定"可恢复的破坏性动作"必须模态；其权威顺序第 1 条要求保留已批准 spec | 不适用 | 保留非模态 Popconfirm，确认键用 `destructive` variant | `confirmation` 的 3 个新场景 |
| D4 异步反馈 | 处理中/成功/失败状态可预期 | Buttons：按钮内可显示活动指示器并在同一位置替换标签；Progress indicators / Loading：确定性优先，忙时保持上下文 | Apple 未规定 Web 按钮槽位的实现方式 | 不适用 | 主操作、进度、成功、失败、重试在同一有界槽位替换 | `feedback` 与 `interaction-modes` 场景 |
| D5 模式状态 | 不出现互相矛盾的控件 | Apple 未直接规定状态模型；Implement contract 要求互斥模式由单一状态模型表达 | 属工程实现契约，非 HIG 条款 | 不适用 | 每页一个显式模式状态机，替代散落布尔量 | `interaction-modes` 的"模式可枚举"场景 |
| D6 稳定锚点 | 操作时目标不位移 | 项目交互契约：临时模式或异步状态不得移动用户目标，锚点位移 ≤1px | Apple HIG 未给出像素级阈值 | 不适用 | 采用项目既有的 ≤1px 契约 | `interaction-modes` 的位移场景 |
| D7 主题机制 | 明暗切换无闪烁、跟随系统 | Accessibility：Dark Mode 下须检查对比度；Color：优先系统定义颜色 | Apple 不规定 Web 主题实现机制 | 不适用 | 遵循 shadcn：`.dark` + `next-themes` | `visual-system` 的 3 个主题场景 |
| D8 打印版式 | A4 打印输出正确 | 无相关 Apple 规范（打印为 Web 平台能力） | 完全空白 | 不适用 | 不纳入本次收敛，保留现状 | 既有 A4 打印测试 |

**Google/Android 回退说明**：本表未使用 Google/Android 来源。原因是 Apple HIG 对上述每一项都给出了可直接采用的结论（或明确属于工程实现契约），不存在"Apple 未定义且属 Android 系统契约"的真实空白，因此按权威顺序无需回退。

## 人类决策记录

| Decision ID | Status | Question | Recommended | Human decision | Owner | Date |
|---|---|---|---|---|---|---|
| D1 / D2 / D4 / D5 | APPROVED | 尺寸口径与改造范围 | 见决策 1 | 本项目为 web/PC、鼠标为主，**页面精致优先于可操作性**；Apple 仅取交互要求，设计规范统一用 shadcn | 用户 | 2026-09-17 |
| D3 | APPROVED | 破坏性确认形态 | 保留非模态 Popconfirm | 保留 Popconfirm | 用户 | 2026-09-17 |
| D7 | APPROVED | 主题机制 | `.dark` + next-themes | 遵循 shadcn 方案 | 用户 | 2026-09-17 |
| D6 | APPROVED（同 D1 裁决覆盖） | 真机验收是否执行 | 自动化验收为主 | 桌面 Web 应用，不执行移动真机验收矩阵 | 用户 | 2026-09-17 |
| 焦点落点 | BLOCKED | 破坏性确认框初始焦点 | 落到取消键 | 待裁决 | 用户 | — |

