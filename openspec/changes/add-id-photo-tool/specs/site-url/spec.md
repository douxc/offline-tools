# Spec Delta

## MODIFIED Requirements

### Requirement: 构建期注入绝对 URL

站点绝对 URL SHALL 由打包流程在构建期注入，SHALL NOT 依赖人工在模板中填写最终值。注入 SHALL 覆盖：七个 HTML 入口的自指 `canonical`、`og:url`、`og:image`、`twitter:image` 与内联 JSON-LD 中的绝对 URL；`sitemap.xml` 的全部条目；`robots.txt` 的 Sitemap 声明。构建完成后的产物 SHALL NOT 残留任何未替换的占位符。

#### Scenario: 六个入口全部注入

- **WHEN** 检查构建产物中既有首页与五个工具页的 HTML
- **THEN** 每页的 canonical、og:url、og:image、twitter:image 与内联 JSON-LD 均使用配置的 host 与该页自身路径

#### Scenario: 七个入口全部注入

- **WHEN** 检查构建产物中首页与六个工具页（含 `/id-photo/`）的 HTML
- **THEN** 每页的 canonical、og:url、og:image、twitter:image 与内联 JSON-LD 均使用配置的 host 与该页自身路径

#### Scenario: 静态资源同步注入

- **WHEN** 检查构建产物中的 `sitemap.xml` 与 `robots.txt`
- **THEN** sitemap 的全部条目与 robots 的 Sitemap 声明均使用配置的 host

#### Scenario: 无残留占位符

- **WHEN** 检查构建产物中的全部文本文件
- **THEN** 不出现未替换的站点 URL 占位符
