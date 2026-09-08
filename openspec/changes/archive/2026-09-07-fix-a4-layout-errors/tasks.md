## 1. 预览缩放修复（stage 挂载时机）

- [x] 1.1 `src/tools/image-a4-layout/A4ImageLayout.tsx`：预览缩放效果改为依赖 `stageReady = items.length > 0`（stage 出现后重跑）；移除效果体内同步 `updateScale()` 调用，改由 `ResizeObserver` 首次异步回调完成初始测量与 `setScale/setOffset`（避免 `react-hooks/set-state-in-effect`）；清空后 cleanup 断开观察，重导入重新测量；隐藏路由 0 尺寸早退逻辑保留；验证：`pnpm lint`、`pnpm exec tsc -b` 通过
- [x] 1.2 CDP 回归：导入 6 张图（每行 1 张）后测量——`.a4-sheet` 矩形完整落入预览区内容盒内（`sheet.right ≤ stageContentRight`、`sheet.bottom ≤ stageContentBottom` 且左右留白均衡）、缩放值等于 `min(可用宽/794, 可用高/1123)` 而非初始 0.4、窗口尺寸改变后缩放随之更新；验证：headless Chrome 复现脚本（repro-layout.cjs）断言全绿
- [x] 1.3 清空后重导入回归：清空图片后再次导入，版面按新测量缩放居中，无上次偏移残留；验证：CDP 断言第二次导入的 sheet 矩形与首次一致

## 2. 每行张数选择器溢出修复

- [x] 2.1 `src/index.css`：`.a4-cols-picker button` 去除 `min-width: 46px`（改 `min-width: 0`），保留 `flex: 1` 并加 `white-space: nowrap`；验证：选择器 `scrollWidth <= clientWidth`，`6 张` 按钮右缘 ≤ 设置面板内容右缘（CDP 测量）
- [x] 2.2 组件测试同步：`A4ColsPicker` 渲染 1–6 六项且当前值激活的既有断言保持；验证：`pnpm test` 相关用例全绿

## 3. 质量门与记录

- [x] 3.1 全量质量门：`pnpm lint`、`pnpm test`（含 `pnpm build`）退出码 0；验证：三条命令通过
- [x] 3.2 变更说明记录：复现基线（scale 0.4/offset 0 顶格、picker 300>260 溢出）与修复后 CDP 测量对比（sheet 完整居中、scrollWidth ≤ clientWidth），并保存 2586×1052 复现截图对比
