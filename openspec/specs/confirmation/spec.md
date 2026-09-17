# confirmation Specification

## Purpose
对不可逆或影响范围大的操作（清空列表、重新选择文件）先给用户一次低打扰的二次确认，避免误触造成工作内容丢失；高频低风险操作（移除单张、排序）不确认，保持操作节奏。

## Requirements

### Requirement: 风险操作二次确认

以下操作 SHALL 在执行前显示锚定在触发按钮上的 Popconfirm 二次确认（非模态、不打断页面上下文）：图片压缩/水印页「清空图片」、A4 排版页「清空图片」、视频取帧页与视频压缩页「重新选择」。确认框 SHALL 说明动作对象与后果；用户确认后 SHALL 才执行操作，用户取消、点击空白处或按 Escape SHALL 不执行任何操作且不改变内容。破坏性确认 SHALL 明确表达动作范围（对象或数量）与后果，其确认控件 SHALL 使用 shadcn 的 `destructive` variant，SHALL NOT 使用强调色（`default`）承担破坏性确认。破坏性确认的适用范围 SHALL 限定为「后果重要、不常见、且用户重新导入即可恢复」的操作，与 Apple Alerts 所指的不可逆且需立即注意的决策区分；已导入内容可重新获得时 SHALL NOT 升级为模态阻断式确认。

#### Scenario: 图片清空需确认
- **WHEN** 用户在图片压缩页已导入多张图片后点击「清空图片」
- **THEN** 按钮旁弹出确认框（含「将移除全部 N 张？」之类对象信息），确认前图片列表保持不变

#### Scenario: 视频重新选择需确认
- **WHEN** 用户在视频取帧页已加载视频后点击「重新选择」
- **THEN** 弹出确认框，确认前当前视频与播放位置保持不变

#### Scenario: 取消不执行
- **WHEN** 用户打开确认框后点击取消或按 Escape
- **THEN** 确认框关闭，列表/视频/设置全部保持原状，无任何数据释放

#### Scenario: 单张操作不确认
- **WHEN** 用户移除列表中的单张图片或调整 A4 顺序
- **THEN** 直接执行，不弹出任何确认框

#### Scenario: 破坏性确认不使用强调色
- **WHEN** 用户查看任意破坏性确认框的确认控件
- **THEN** 该控件使用 `destructive` variant 呈现，而非强调色主按钮

### Requirement: 确认框为轻量覆盖

Popconfirm SHALL 以触发按钮为锚点轻量展开，SHALL NOT 使用模态 AlertDialog 或 Dialog；展开与关闭 SHALL NOT 移动页面其他内容（稳定锚点位移 ≤1px）；打开确认框后焦点 SHALL 落在「取消」控件上（破坏性动作 SHALL NOT 成为初始焦点目标，避免误按 Return 触发不可逆操作），关闭后焦点 SHALL 回到触发按钮。确认框的视觉 SHALL 由 shadcn token 表达，其容器 SHALL 使用 `popover` 语义（`bg-popover`/`text-popover-foreground`/`border`），SHALL NOT 使用自建色值。

#### Scenario: 展开不位移
- **WHEN** 用户在设置面板点击「清空图片」使其确认框展开
- **THEN** 面板内其他控件位置不变，确认框作为覆盖层显示在按钮附近

#### Scenario: 焦点回归
- **WHEN** 用户打开确认框后再按 Escape 关闭
- **THEN** 键盘焦点回到「清空图片」触发按钮

#### Scenario: 保持非模态
- **WHEN** 用户打开破坏性确认框
- **THEN** 页面其余部分仍可被指针操作与阅读，不出现模态遮罩与焦点陷阱

#### Scenario: 初始焦点不落在破坏性动作
- **WHEN** 破坏性确认框打开
- **THEN** 初始键盘焦点位于「取消」控件，按 Return 不会执行破坏性操作
