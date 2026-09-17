## MODIFIED Requirements

### Requirement: 圆角与控件尺寸统一

卡片与控件圆角 SHALL 由 shadcn 的单一 `--radius` token 及其派生链表达，SHALL NOT 各自定义独立圆角刻度。页面按钮 SHALL 使用 shadcn 官方 Button 组件及其官方 `variant`（`default`/`destructive`/`outline`/`secondary`/`ghost`/`link`）与 `size` 档位（`default` 36px、`sm` 32px、`lg` 40px、`icon` 36×36px）；页面 SHALL NOT 实现 `.primary-button`/`.export-button`/`.ghost-button` 等独立按钮外观。界面中的分段控件、图标按钮、翻页控件 SHALL 由 shadcn 官方组件（`ToggleGroup`/`Toggle`/`Button`）承载，SHALL NOT 使用页面自建按钮类或原生 `<button>` 自行实现；呈现为按钮的交互元素 SHALL NOT 使用非交互容器（如 `<span>`）冒充。

#### Scenario: 按钮样式一致
- **WHEN** 用户查看首页、工具页、设置面板中的主要按钮
- **THEN** 相同层级的按钮具有相同的组件、`variant`、`size`、高度、圆角与 hover/active 反馈，且高度取自 shadcn 档位

#### Scenario: 同组按钮尺寸相同
- **WHEN** 同一操作区域内并排出现两个按钮（例如「打印 A4 版面」与「清空图片」）
- **THEN** 两者高度、圆角、字重与垂直对齐一致，层级差异由 `variant` 表达而非尺寸

#### Scenario: 分段控件使用官方组件
- **WHEN** 用户查看 A4 页的「每行张数」或视频页的批量采样模式选择
- **THEN** 选中态由 shadcn `ToggleGroup` 的 `data-state` 表达，不使用自建 `.a4-cols-picker` 类

#### Scenario: 无冒充按钮
- **WHEN** 审阅任意页面的交互元素
- **THEN** 不存在以 `<span>` 等非交互容器承载点击行为并呈现按钮外观的元素

### Requirement: 命中区

交互控件的有效命中区 SHALL 不小于其视觉尺寸，且 SHALL NOT 通过放大可见盒子来制造命中区。图标类控件 SHALL 在视觉尺寸之外扩展命中区域（例如以伪元素扩展），使可点区域大于可见图标而不改变可见控件尺寸与相邻控件间距；滑块 SHALL 提供不小于其可见高度的拖动热区。移动端为次要目标：本项目以桌面指针操作为主，触控命中区按所选设计系统（shadcn）的基准执行，Apple 对触控的 44pt 建议不强制套用于可见控件尺寸。

#### Scenario: 图标按钮可见尺寸与命中区解耦
- **WHEN** 用户查看 A4 列表行的上移/下移/移除控件
- **THEN** 可见控件为 shadcn `icon` 档尺寸，可点区域大于可见图标，且不把列表行撑高

#### Scenario: 列表行图标可点
- **WHEN** 用户在列表行内点击移除/排序图标
- **THEN** 点击图标及其周边扩展区域即可命中，相邻行的图标不会误触

#### Scenario: 滑块易拖动
- **WHEN** 用户点击滑块轨道附近区域
- **THEN** 在轨道行高范围内均可拖动调整

## ADDED Requirements

### Requirement: 组件来源为 shadcn 官方

界面组件 SHALL 来自 shadcn 官方注册表；项目自建组件 SHALL 只用于该注册表没有对应项的领域专用界面（打印版面、A4 物理尺寸版式、媒体预览画布、拖放导入区）。自建组件 SHALL 使用与 shadcn 相同的 token 与语义工具类，SHALL NOT 引入独立的颜色或尺寸体系。

#### Scenario: 通用控件来自官方注册表
- **WHEN** 审阅按钮、卡片、选择器、滑块、标签页、开关组、弹层与提示的实现来源
- **THEN** 均可对应到 shadcn 官方注册表条目，无项目自建的同名替代实现

#### Scenario: 领域专用界面使用同一 token
- **WHEN** 审阅打印版面与 A4 版式的样式
- **THEN** 其颜色与间距取自同一套 shadcn token，不引入独立色值

### Requirement: 控件样式通过 shadcn token 表达

界面颜色、边框、焦点环与控件底色 SHALL 通过 shadcn 语义 token 派生的 Tailwind 语义工具类（`bg-background`、`text-foreground`、`bg-card`、`text-muted-foreground`、`border-border`、`ring-ring`、`bg-primary` 等）表达；组件内 SHALL NOT 直接写 `bg-[var(--something)]` 形式的自定义变量引用，SHALL NOT 硬编码具体色值。Button 组件基类 SHALL 统一约束其内部图标尺寸（`[&_svg]:size-4`），页面 SHALL NOT 为同一层级控件传入互不相同的图标尺寸。

#### Scenario: 组件使用语义工具类
- **WHEN** 审阅 `src/components/ui/` 下任意组件的类名
- **THEN** 颜色与边框由语义工具类表达，不出现 `var(--` 直写与十六进制色值

#### Scenario: 图标尺寸统一
- **WHEN** 用户查看各页面的按钮图标
- **THEN** 同一层级控件内的图标尺寸一致，由 Button 基类统一约束，而非各处手工传入不同数值

### Requirement: 颜色 token 结构与 shadcn 一致

主题颜色变量 SHALL 采用 shadcn 的语义命名与结构：`:root` 定义亮色值，`.dark` 定义暗色覆盖，至少包含 `--background`、`--foreground`、`--card`、`--card-foreground`、`--popover`、`--popover-foreground`、`--primary`、`--primary-foreground`、`--secondary`、`--secondary-foreground`、`--muted`、`--muted-foreground`、`--accent`、`--accent-foreground`、`--destructive`、`--destructive-foreground`、`--border`、`--input`、`--ring`、`--warning`、`--warning-foreground`、`--chart-1`…`--chart-5` 与 `--sidebar-*` 系列；颜色值 SHALL 使用 oklch 表示。这些变量 SHALL 通过 `@theme inline` 映射为 Tailwind 语义工具类。主 spec 中原有的 `--ink`/`--muted`/`--line`/`--panel` 等自定义命名 SHALL NOT 继续作为界面 token 使用。

#### Scenario: 亮暗两态由类名切换
- **WHEN** 用户在暗色模式下切换到亮色模式
- **THEN** 根元素的 `.dark` 类状态改变，全部界面颜色随 token 整体切换，无残留硬编码色块

#### Scenario: 语义工具类可用
- **WHEN** 在任意组件中使用 `bg-primary`、`text-muted-foreground` 或 `border-border`
- **THEN** 这些工具类解析到对应的 shadcn token，无需组件自行引用 CSS 变量

#### Scenario: 辅助文字可读
- **WHEN** 用户阅读辅助说明、提示与元信息文字
- **THEN** 文字与背景对比度 ≥4.5:1，亮暗两种主题下均满足

### Requirement: 主题机制遵循 shadcn 方案

明暗主题 SHALL 以 `.dark` 类为键，并由 `next-themes` 管理主题状态（存储、系统偏好跟随、切换）；项目 SHALL NOT 自行维护主题 Provider 与 `data-theme` 属性。首屏 SHALL NOT 出现主题闪烁。

#### Scenario: 切换与保持
- **WHEN** 用户切换主题并刷新页面
- **THEN** 主题保持为用户选择的值，首次绘制即为该主题，无亮暗闪变

#### Scenario: 跟随系统偏好
- **WHEN** 用户未显式选择主题且操作系统外观发生变化
- **THEN** 页面主题跟随系统偏好更新

#### Scenario: 无遗留机制
- **WHEN** 审阅主题实现
- **THEN** 不存在自建 ThemeProvider 组件与 `data-theme` 选择器
