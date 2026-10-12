# Spec Delta

## MODIFIED Requirements

### Requirement: 一级分组导航

站点每个页面（含首页）SHALL 在顶部导航中提供两个一级分组「视频」「图片」；视频组 SHALL 覆盖 `/video-frame/` 与 `/video-compress/`，图片组 SHALL 覆盖 `/image-compress/`、`/image-watermark/` 与 `/image-a4-layout/`；当前页面所属分组 SHALL 高亮显示并以 `aria-current` 标记；点击分组 SHALL 跳转到该分组第一个工具页（视频组→视频取帧，图片组→图片压缩）。分组归属与高亮判定 SHALL 在剥除语言路径前缀后仍然成立，使任一语言下的同一工具得到相同的分组结果；分组链接的目标语言由 `i18n` capability 的「站内导航与当前语言一致」决定。

#### Scenario: 视频压缩页显示正确分组
- **WHEN** 用户访问 `/video-compress/`
- **THEN** 一级导航高亮「视频」分组并带 `aria-current`，不再错误高亮其他工具

#### Scenario: 点击分组跳转组内首工具
- **WHEN** 用户在图片水印页点击一级分组「视频」
- **THEN** 跳转到 `/video-frame/`，页面首屏为视频取帧工具

#### Scenario: 首页高亮分组
- **WHEN** 用户访问首页 `/`
- **THEN** 一级导航不标记任何分组为当前页，分组仍可点击

#### Scenario: 语言前缀下分组仍正确
- **WHEN** 用户访问 `/ja/image-watermark/` 或 `/zh/video-frame/`
- **THEN** 分组高亮与同路径的中文版本一致（分别为「图片」「视频」），不因前缀而失去高亮

## ADDED Requirements

### Requirement: 语言切换入口位于站点页头

站点页头 SHALL 提供语言切换入口（其语言集合、当前语言标记与切换行为由 `i18n` capability 定义）。入口 SHALL 与一级分组导航同处页头，使首页与全部工具页都可到达。

#### Scenario: 首页可到达入口

- **WHEN** 用户查看首页 `/` 的页头
- **THEN** 页头存在语言切换入口

#### Scenario: 每个工具页都可到达入口

- **WHEN** 用户浏览任一工具页的页头
- **THEN** 页头存在语言切换入口，无需返回首页即可切换语言
