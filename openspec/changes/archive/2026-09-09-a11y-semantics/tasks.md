## 1. 语义实现

- [x] 1.1 `App.tsx` 导出格式分段按钮增加 `aria-pressed={format === item}` — verify: 现有 `App.test.tsx` 通过 + 手测切换格式
- [x] 1.2 `text-overlay-panel.tsx` 位置分段按钮增加 `aria-pressed={position === item.value}` — verify: `text-overlay-panel.test.tsx` 更新并通过
- [x] 1.3 `ImageProcessor.tsx` 列表选中按钮增加 `aria-pressed={selected?.id === asset.id}` — verify: `pnpm test` 中 ImageProcessor 相关 SSR 测试通过

## 2. 语义回归测试

- [x] 2.1 新增 `src/components/tool-header.test.tsx`：video-frame 路由「视频」`aria-current="page"`、image-a4-layout 路由「图片」current、home 无 current — verify: 新测试通过并加入 `package.json` test script
- [x] 2.2 `text-overlay-panel.test.tsx`/`App.test.tsx` 追加分段 `aria-pressed` 断言 — verify: 相关测试通过

## 3. 文档与验证

- [x] 3.1 `README.md` 补充验收政策：无障碍 = 代码/语义 + 自动化测试，不做真机 TalkBack — verify: 段落与实现口径一致
- [x] 3.2 `pnpm test` 全绿 + `pnpm lint` 通过 + `openspec validate` — verify: 三条命令输出
