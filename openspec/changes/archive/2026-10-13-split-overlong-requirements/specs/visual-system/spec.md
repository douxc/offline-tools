# Spec Delta

## MODIFIED Requirements

### Requirement: 颜色 token 结构与 shadcn 一致

主题颜色变量 SHALL 采用 shadcn 的语义命名与结构：`:root` 定义亮色值，`.dark` 定义暗色覆盖，全部界面颜色随类名在亮暗两态间整体切换。既有主 spec 中的 `--ink`/`--muted`/`--line`/`--panel` 等自定义命名 SHALL NOT 继续作为界面 token 使用。

#### Scenario: 亮暗两态由类名切换

- **WHEN** 用户在暗色模式下切换到亮色模式
- **THEN** 根元素的 `.dark` 类状态改变，全部界面颜色随 token 整体切换，无残留硬编码色块

#### Scenario: 两个主题的 token 集合一致

- **WHEN** 审查 `:root` 与 `.dark`（或亮色类）中的颜色变量
- **THEN** 语义 token 在两个主题中均已定义，不存在只在单侧定义的语义 token

#### Scenario: 语义工具类可用

- **WHEN** 在任意组件中使用 `bg-primary`、`text-muted-foreground` 或 `border-border`
- **THEN** 这些工具类解析到对应的 shadcn token，无需组件自行引用 CSS 变量

#### Scenario: 辅助文字可读

- **WHEN** 用户阅读辅助说明、提示与元信息文字
- **THEN** 文字与背景对比度 ≥4.5:1，亮暗两种主题下均满足

## ADDED Requirements

### Requirement: 必需的语义 token 集合

token 集合 SHALL 至少包含 `--background`、`--foreground`、`--card`、`--card-foreground`、`--popover`、`--popover-foreground`、`--primary`、`--primary-foreground`、`--secondary`、`--secondary-foreground`、`--muted`、`--muted-foreground`、`--accent`、`--accent-foreground`、`--destructive`、`--destructive-foreground`、`--border`、`--input`、`--ring`、`--warning`、`--warning-foreground`、`--chart-1`…`--chart-5` 与 `--sidebar-*` 系列。该集合为下限：SHALL NOT 因新增界面配色而削减上述任一变量。

#### Scenario: 必需 token 齐备

- **WHEN** 审查主题样式表中的颜色变量定义
- **THEN** 上述清单中的每个 token 均有定义，无遗漏

### Requirement: 颜色表示与语义工具类映射

颜色值 SHALL 使用 oklch 表示。上述变量 SHALL 通过 `@theme inline` 映射为 Tailwind 语义工具类，使组件无需自行引用 CSS 变量。

#### Scenario: 颜色统一以 oklch 表达

- **WHEN** 审查主题样式表中的颜色值
- **THEN** 颜色值均为 oklch 表示，不混入 hex/rgb 等其它写法

### Requirement: 辅助文字对比度

辅助说明、提示与元信息文字与背景的对比度 SHALL ≥4.5:1，亮暗两种主题下均 SHALL 满足。

#### Scenario: 辅助文字在两种主题下均可读

- **WHEN** 分别在亮色与暗色主题下检查辅助说明、提示与元信息文字
- **THEN** 两种主题下文字与背景的对比度均 ≥4.5:1
