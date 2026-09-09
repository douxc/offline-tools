## Purpose

保证辅助技术用户能通过状态语义（而非颜色/形状）感知分段控件、列表选中项与当前页面；验收方式为代码语义 + 自动化测试（不做真机 TalkBack 测试，用户决策）。

## ADDED Requirements

### Requirement: 分段控件选中状态语义

互斥选择的分段控件（导出图片格式、文字叠加位置、批量抽帧模式、每行张数等）SHALL 通过 `aria-pressed`（或 tab 语义 `role="tab"` + `aria-selected`）暴露当前选中项；选中态 SHALL NOT 仅依赖背景色/边框。

#### Scenario: 导出格式分段可感知
- **WHEN** 用户在视频取帧页选择 JPG 格式
- **THEN** JPG 分段按钮带有 `aria-pressed="true"`，其余分段为 `false`

#### Scenario: 文字叠加位置分段可感知
- **WHEN** 用户切换文字叠加位置为「顶部居中」
- **THEN** 该分段按钮带有 `aria-pressed="true"`，另一项为 `false`

### Requirement: 列表选中项状态语义

列表中被选中的项目（图片压缩/水印预览对象）SHALL 在可聚焦的选择控件上暴露选中态语义（`aria-pressed` 或 `aria-current`），选中项 SHALL NOT 仅依赖 `active` 样式类。

#### Scenario: 切换预览图片
- **WHEN** 用户点击列表中的另一张图片
- **THEN** 该图片选择按钮带有 `aria-pressed="true"`，原选中项为 `false`，预览区显示新图片

### Requirement: 验收为语义与自动化测试

无障碍验收 SHALL 采用代码语义检查 + 自动化回归测试（SSR 语义断言），SHALL NOT 将真机 TalkBack 测试列为完成条件。每次改动后 SHALL 保持相关语义测试通过。

#### Scenario: 语义回归测试通过
- **WHEN** 运行 `pnpm test`
- **THEN** 覆盖导航 `aria-current`、tab 语义、分段 `aria-pressed`、Popconfirm 触发属性的语义测试全部通过
