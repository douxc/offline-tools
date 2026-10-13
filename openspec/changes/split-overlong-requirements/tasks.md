# Tasks

## 1. 拆分结果核对（写 delta 之前）

- [x] 1.1 逐片段核对 `visual-system` 的拆分覆盖原文全部约束：`:root`/`.dark` 定义位置、`--ink`/`--muted`/`--line`/`--panel` 禁用、完整变量清单（`--background` 至 `--sidebar-*`、`--chart-1`…`--chart-5`）、oklch、`@theme inline` 与 Tailwind 工具类映射、对比度 ≥4.5:1。核对方式为脚本列出原文关键片段并断言均出现在拆分结果中，缺失即失败。
- [x] 1.2 同法核对 `analytics`：`_trackEvent` 的 category/action/label、报表区分「被打开」与「被真正用完」、固定枚举、标签只用站点固定取值、数值只承载无用户语义计数、不上报文件内容/文件名/路径/用户数据、逐工具覆盖节点、取消记为取消。
- [x] 1.3 核对场景守恒：被拆两条各有 3 个既有场景，须**全部保留在各自的 MODIFIED 块内**（工具会直接报错拒绝缺失，见 `openspec validate --strict` 的 `omits scenario(s)` 检查）。ADDED 各条使用不重名的新场景，避免同一场景名在一份 delta 中出现两次。
- [x] 1.4 核对每条要求正文 <500 字符（验证器阈值），并确认无约束被新增或放宽 —— 除已明确交代的例外（「集合为下限」的措辞显式化、新增「两个主题的 token 集合一致」场景，后者有既有测试守护）。曾拟新增的「新增界面配色 SHALL 优先复用既有语义 token」因无断言支撑且未核实，已删除。

## 2. 同步进主 specs

- [x] 2.1 同步 `visual-system`：MODIFIED 块替换主 spec 中的 `颜色 token 结构与 shadcn 一致`，并向主 specs 新增 3 条 ADDED 要求。确认主 spec 的 `## Purpose` 段与其它 7 条要求逐字未动。
- [x] 2.2 同步 `analytics`：MODIFIED 块替换 `关键工具行为事件口径`，并新增 1 条 ADDED 要求。确认 `## Purpose` 与其它 7 条要求逐字未动。
- [x] 2.3 同步后重跑全量比对：每条 delta 要求及其场景均落地，无待应用项。
- [x] 2.4 用 `git diff openspec/specs/` 确认改动**只**限于这两条要求所在位置，且不含 `## Purpose` 段与未涉及的要求；要求总数应为 `visual-system` 8 → 11、`analytics` 8 → 9。

## 3. 验证与回归

- [x] 3.1 运行 `openspec validate --specs --strict`，确认 `visual-system` 与 `analytics` 的「要求正文超过 500 字符」警告消失，且通过项数不减少（此前为 10 项通过）。
- [x] 3.2 运行 `pnpm test` 全绿，确认 `tests/theme-tokens-embed.test.mjs`、`tests/contrast-embed.test.mjs`、`tests/analytics-embed.test.mjs`、`tests/analytics-events-embed.test.mjs` 等既有契约测试未受影响（本次不改代码，此项用于确认契约重整没有意外改变被断言的内容）。
- [x] 3.3 运行 `pnpm lint` 通过。
- [x] 3.4 记录验证结果：两条警告消除、场景守恒、无代码改动、测试与 lint 全绿。
  - `openspec validate --specs --strict`：**12 项通过 / 0 失败**（此前 10 通过 / 2 失败）；`visual-system` 与 `analytics` 的「要求正文超过 500 字符」警告均消除。
  - 要求数：`visual-system` 8 → 11，`analytics` 8 → 9；场景数 25 与 20（既有场景全部保留在 MODIFIED 块内，未丢未改）。
  - `pnpm test`：342/342 全绿，含 `theme-tokens-embed`（其中「两个主题的 shadcn 语义 token 集合完全一致」正是新增场景所依据的断言）、`contrast-embed`、`analytics-embed`、`analytics-events-embed`。
  - `pnpm lint` 通过。
  - `git diff openspec/specs/` 仅触及两条被拆要求所在位置与 4 条新增要求；两处 `## Purpose` 段与未被拆分的要求逐字未动。
  - 无代码改动：`src/`、`tests/`、构建配置与产物均未修改。
