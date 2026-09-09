# site-content Specification

## Purpose
全站工具链接与许可页脚收敛为公共组件并补全缺失项：任何页面的相关工具入口覆盖全部 5 个工具，首页结构化数据与无脚本导航不再漏项，许可页脚在所有主要内容页一致出现。

## Requirements

### Requirement: 相关工具链接完整

工具相关链接区域 SHALL 以公共组件渲染，列出全部 5 个工具（视频取帧、视频压缩、图片压缩、添加水印、A4 排版）并排除当前页自身；每个链接 SHALL 指向正确路由、支持修饰键/中键打开；出现在工具页「相关工具」区域与需要工具的页面（含 A4 页）。

#### Scenario: 相关工具不漏项
- **WHEN** 用户在视频取帧页查看「相关工具」
- **THEN** 列表包含视频压缩、图片压缩、添加水印、A4 排版（不含当前页），点击视频压缩直达 `/video-compress/`

#### Scenario: 新标签打开
- **WHEN** 用户在相关工具链接上使用 Cmd/Ctrl 点击或中键
- **THEN** 新标签页打开目标工具，当前页不变

### Requirement: 首页结构化数据与无脚本导航完整

首页 `/` 的 JSON-LD ItemList（SEO_PAGES 与静态 `index.html` 内联 JSON-LD）SHALL 列出全部 5 个工具条目；静态 HTML 的 `<noscript>` 导航 SHALL 列出全部 5 个工具；每个工具条目 SHALL 使用对应的规范 URL 与名称。

#### Scenario: 首页 JSON-LD 五项齐全
- **WHEN** 搜索引擎抓取首页 HTML 与客户端 SEO_PAGES
- **THEN** ItemList 含 5 个条目（视频取帧、视频压缩、图片压缩、添加水印、A4 排版），URL/名称与 `TOOL_PATHS` 一致

#### Scenario: 无脚本导航齐全
- **WHEN** 用户禁用 JavaScript 打开首页
- **THEN** 无脚本页面提供全部 5 个工具链接

### Requirement: 许可页脚统一

主要内容页（首页、视频取帧、视频压缩、图片压缩、添加水印、A4 排版）SHALL 以公共组件渲染同一许可页脚：包含「GPL-3.0-or-later · 本地处理 · 不上传文件」声明与「第三方许可」「对应源代码」两个链接；站点级 ICP 固定页脚保持独立不变。

#### Scenario: 六个页面页脚一致
- **WHEN** 用户分别访问 6 个入口页面
- **THEN** 每页底部出现同一套许可声明与两个许可链接，且都以相对路径导航到 `/legal/` 文档

#### Scenario: 打印时隐藏
- **WHEN** 用户从 A4 排版页调用浏览器打印
- **THEN** 打印输出不包含许可页脚与 ICP 页脚
