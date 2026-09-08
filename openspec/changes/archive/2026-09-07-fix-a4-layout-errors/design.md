## Context

`add-image-flow-layout` 实现后，`A4ImageLayout` 的预览缩放效果在组件挂载时执行：当时排版列表为空、预览区 stage 尚未渲染，`stageRef.current` 为 null，效果体 `return` 提前退出且依赖数组为 `[]`——之后导入图片、stage 出现时效果不会重跑，`scale` 永远停在初始值 0.4、offset 停在 (0,0)，版面固定在预览区左上角且与区域尺寸不符（图片被裁切）。副现象：`每行张数` 选择器 6 个按钮 `min-width: 46px`（合计 300px，含间距更宽）超过 320px 设置面板内容宽（260px），`6 张` 按钮被裁切。两处均已在真实浏览器复现测量（sheet 317×449 @ scale 0.4 顶格于 610×542 预览区；picker scrollWidth 300 > clientWidth 260）。动机与范围见 proposal.md – Why。

## Goals / Non-Goals

**Goals:**
- 导入图片、窗口缩放、清空后重导入三种情况下，预览版面均按预览区可用尺寸等比缩放、居中、完整显示。
- 「每行张数」1–6 选项全部可见、可点击，无溢出/裁切。
- 不改变排版计算、打印输出、模式 tab 行与其余交互。

**Non-Goals:**
- 模式 tab 条的全宽样式（用户确认不在本次范围）。
- 预览区布局重构、拖拽排序等无关改动。

## Decisions

### 1. 预览缩放：效果依赖 stage 挂载状态，测量交给 ResizeObserver

组件里 `const stageReady = items.length > 0;`，缩放效果改为依赖 `[stageReady]`：

- stage 出现后（导入图片）效果重跑：`ResizeObserver.observe(stage)`，并由 RO 的**首次异步回调**完成初始测量与 `setScale/setOffset`——不在效果体内同步 `setState`（该模式已被 `react-hooks/set-state-in-effect` 禁止），也无须手动调用 `updateScale()`。
- RO 同时覆盖窗口缩放与清空后重导入：清空后 stage 卸载（observer 在 cleanup 中 `disconnect`），重导入时重新 observe 并测量；隐藏路由下 `clientWidth = 0` 时 `updateScale` 早退，回到 A4 路由时 RO 尺寸变化回调重新测量。
- 回退默认值处理：不额外「复位」state（reset 会引入同步 setState），因为下一次 observe 会重新测量覆盖，无残留风险。

- 备选：callback ref 驱动 `stageEl` state + 依赖 `[stageEl]` —— 同样可行但多一个 state，且目前效果体无需额外依赖，采用更小的 `stageReady` 方案。
- 备选：空状态也渲染 stage（提前挂载）—— 被拒：空状态下无版面，白白占用版面区域并破坏空态布局。
- 备选：在 render 阶段直接计算派生尺寸 —— 被拒：DOM 测量不能在渲染期间进行。

### 2. 每行张数选择器：按钮允许收缩

`.a4-cols-picker button` 由 `min-width: 46px` 改为 `min-width: 0`（保留 `flex: 1`，按钮按容器均分；260px / 6 ≈ 43px，`6 张` 文案约 30px 仍可完整显示），或等价地在窄容器时 `flex: 1 1 0` + `padding-inline: 4px`。经验证选择器 `scrollWidth <= clientWidth` 且 `6 张` 按钮右缘不超出设置面板内容区。

- 备选：换行/两行布局 —— 被拒：一行六项是既有交互形态，收缩即可修复。
- 备选：步进控件（-/+）—— 被拒：改变交互形态，超出修复范围。

## Risks / Trade-offs

- [RO 首次回调发生在下一帧，首帧可能短暂显示默认缩放值] → 只影响一帧且发生在导入瞬间，可接受；观察后续帧立即校正。
- [`stageReady` 仅反映「非空」，stage 在隐藏路由下尺寸为 0] → `updateScale` 对 0 尺寸早退，回到路由时 RO 回调自动重测，无残留。
- [选择器按钮过窄导致 `6 张` 文字换行] → `white-space: nowrap` 兜底；43px 宽足够容纳 12px 字号文案。

## Migration Plan

无数据迁移；修复后 A4 排版页屏幕端即时生效，打印输出不变。回滚 = 还原两处改动。

## Open Questions

（无）
