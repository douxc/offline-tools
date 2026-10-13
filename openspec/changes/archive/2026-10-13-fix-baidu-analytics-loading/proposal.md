# Proposal

## Why

2026-10-11 在生产首页确认：页面携带正确的百度统计标识，但加载器对只读的 `script.dataset` 整体赋值，引发 TypeError，导致 `hm.js` 未插入页面。连续 15 天的零访问报告因此无法代表实际访问情况，需要先恢复统计并完成上线验收，再开始新的 15 天观察期。

## What Changes

- 修复统计脚本元素的属性赋值，使生产在线页面能正常插入百度统计脚本。
- 收紧脚本元素的结构类型，并让测试替身模拟真实 DOM 的只读 `dataset` 属性，新增能重现本次故障的回归测试。
- 验证空闲回调及计时器调度、重复加载、开发环境、显式关闭统计和离线恢复等既有行为。
- 将生产构建的真实浏览器检查与百度后台验收列为上线核对项；确认实际访问与工具事件被后台接收后，再确定 15 天观察期起点。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

无。此次修复恢复 `add-baidu-analytics` 变更中已有的统计加载、访问和工具事件契约，不增加或修改需求；本变更以 `skip_specs: true` 显式跳过 delta specs。

已有 `analytics` 规范仍位于 `openspec/changes/add-baidu-analytics/specs/analytics/spec.md`，尚未归档到主规范目录。本提案引用该契约作为依据，不复制规范、不修改原变更任务状态。

## Impact

- 预计修改 `src/lib/analytics.ts` 与 `src/lib/analytics.test.ts`；复用现有路由、工具事件和构建产物测试。
- 不新增依赖。统计站点标识、上报字段、文件本地处理、PWA 缓存策略及现有托管平台保持现有约定。
- 本次交付为修复规划；实施、生产发布和后台核对需要后续执行，15 天观察记录不作为本地自动化测试。
- 三语支持和 Cloudflare 迁移暂缓，不属于本变更。
