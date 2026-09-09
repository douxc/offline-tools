# visual-system Specification

## Purpose
把散落在页面 CSS 中的字号、颜色、圆角、按钮样式与点击热区统一到一套视觉 token 与公共组件上，消除同一控件多套样式与主题补丁，保证桌面/移动、明/暗主题下观感与可操作性一致。

## Requirements

### Requirement: 文字尺寸下限

面向用户的信息文字（含页脚、徽标、辅助说明、元信息）SHALL 不低于 12px；现有低于 12px 的界面文字 SHALL 提升至该下限。打印版面（A4 纸张内容）与纯装饰性图形不受此限。

#### Scenario: 列表元信息可读
- **WHEN** 用户在图片/ A4 列表查看文件名与尺寸元信息
- **THEN** 元信息文字不小于 12px，且不被截断为省略号

#### Scenario: 页脚提升
- **WHEN** 用户查看许可页脚与 ICP 页脚
- **THEN** 文字不小于 12px

### Requirement: 颜色 token 化

界面颜色 SHALL 通过语义 CSS 变量（`--ink`、`--muted`、`--soft-text`、`--line`、`--panel` 等）表达；组件与页面样式 SHALL NOT 硬编码具体的灰阶色值；暗/明主题差异 SHALL 集中在主题变量定义处，不通过零散 `[data-theme="light"]` 覆盖逐条打补丁；主要文字与背景的对比度 SHALL 满足 WCAG AA（普通文字 ≥4.5:1）。

#### Scenario: 明暗主题一次切换
- **WHEN** 用户在暗色主题下切换为亮色主题
- **THEN** 全部界面元素颜色随主题变量整体切换，无残留暗色系硬编码色块

#### Scenario: 辅助文字可读
- **WHEN** 用户阅读辅助说明、提示与元信息文字
- **THEN** 文字与背景对比度 ≥4.5:1

### Requirement: 圆角与控件尺寸统一

卡片与控件圆角 SHALL 只使用 `--radius-*` token；页面按钮 SHALL 使用公共 Button 组件（default/outline/ghost 等 variants）+ 统一高度档位（默认 44px、大 52px、小 36px），页面样式不再各自实现 `.primary-button`/`.export-button`/`.ghost-button` 等独立外观。

#### Scenario: 按钮样式一致
- **WHEN** 用户查看首页、工具页、设置面板中的主要按钮
- **THEN** 相同层级按钮具有相同圆角、高度、间距与 hover/active 反馈

### Requirement: 命中区

图标类交互目标（含移除/排序/上一页/下一页/主题切换）SHALL 提供 ≥44×44px（Apple 44pt / 移动端 ≥48dp）的有效点击/触摸命中区，视觉图标可以保持更小；滑块 SHALL 提供 ≥44px 的拖动热区（轨道行高与拇指命中区扩大）。

#### Scenario: 列表行图标可点
- **WHEN** 用户在移动端点击列表行内的移除/排序图标
- **THEN** 点击中心 44px 范围内即可命中，相邻行图标不会误触

#### Scenario: 滑块易拖动
- **WHEN** 用户点击滑块轨道附近区域
- **THEN** 44px 热区内均可拖动调整
