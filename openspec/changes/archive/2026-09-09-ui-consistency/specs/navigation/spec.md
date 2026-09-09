## Purpose

全站导航信息架构统一为「一级分组（视频/图片）+ 二级工具 tab」：用户在任何工具页都能看到自己所属的分组、能直达组内其他工具，且当前页指示与真实路由一致。

## ADDED Requirements

### Requirement: 一级分组导航

站点每个页面（含首页）SHALL 在顶部导航中提供两个一级分组「视频」「图片」；视频组 SHALL 覆盖 `/video-frame/` 与 `/video-compress/`，图片组 SHALL 覆盖 `/image-compress/`、`/image-watermark/` 与 `/image-a4-layout/`；当前页面所属分组 SHALL 高亮显示并以 `aria-current` 标记；点击分组 SHALL 跳转到该分组第一个工具页（视频组→视频取帧，图片组→图片压缩）。

#### Scenario: 视频压缩页显示正确分组
- **WHEN** 用户访问 `/video-compress/`
- **THEN** 一级导航高亮「视频」分组并带 `aria-current`，不再错误高亮其他工具

#### Scenario: 点击分组跳转组内首工具
- **WHEN** 用户在图片水印页点击一级分组「视频」
- **THEN** 跳转到 `/video-frame/`，页面首屏为视频取帧工具

#### Scenario: 首页高亮分组
- **WHEN** 用户访问首页 `/`
- **THEN** 一级导航不标记任何分组为当前页，分组仍可点击

### Requirement: 二级工具 tab

各工具页 SHALL 在页首提供所在分组的二级工具 tab：视频页为「视频取帧 / 视频压缩」，图片页为「图片压缩 / 添加水印 / A4 排版」；每个 tab SHALL 是可直接到达对应路由的链接（支持中键/修饰键打开新标签），当前路由对应的 tab SHALL 以 `aria-current`/`aria-selected` 语义标记选中态；tab 组 SHALL 支持键盘方向键切换与焦点可见。

#### Scenario: 视频页切换工具
- **WHEN** 用户在 `/video-frame/` 点击二级 tab「视频压缩」
- **THEN** 路由切换至 `/video-compress/` 且该 tab 变为选中态，页面显示压缩工作台

#### Scenario: 图片页 tab 与路由一致
- **WHEN** 用户依次访问三个图片路由
- **THEN** 每个路由下对应 tab 为选中态且带当前页语义，其余 tab 为非选中态

#### Scenario: 键盘操作 tab
- **WHEN** 用户用键盘聚焦到二级 tab 组并按左右方向键
- **THEN** 焦点在 tab 间移动且受 `aria-selected` 指示，回车激活当前聚焦 tab

#### Scenario: 中键打开新标签
- **WHEN** 用户在 tab 上使用鼠标中键点击
- **THEN** 浏览器在新标签页打开对应工具路由，当前页面不变
