# site-url Specification

## Purpose
把站点对外绝对 URL 的来源收敛为构建配置中的单一位置，并在构建期统一注入到 HTML 入口与 `public/` 静态资源，使换域名只需改一处，且产物中不残留任何旧域名。

## Requirements

### Requirement: 站点对外 URL 的单一来源

站点的对外绝对 URL（协议 + host，例如 `https://offline-tools.colors-cc.top`）SHALL 只有一个定义位置，位于构建配置可读取的模块中；客户端运行时代码、页面模板与静态资源模板 SHALL NOT 各自硬编码该 host。构建 SHALL 支持通过环境变量覆盖该值，未提供覆盖时 SHALL 回退到内置默认值，使无环境变量的构建环境也能产出正确产物。

#### Scenario: 换域名只改一处

- **WHEN** 维护者需要把站点迁移到新的 host
- **THEN** 只需修改单一来源定义（或在构建环境提供覆盖变量），无需在页面模板、静态资源或源码中逐处替换

#### Scenario: 无环境变量构建仍正确

- **WHEN** 构建环境未提供任何站点 URL 相关的环境变量
- **THEN** 构建仍产出使用内置默认 host 的绝对 URL，且构建成功

### Requirement: 构建期注入绝对 URL

站点绝对 URL SHALL 由打包流程在构建期注入，SHALL NOT 依赖人工在模板中填写最终值。注入 SHALL 覆盖：六个 HTML 入口的自指 `canonical`、`og:url`、`og:image`、`twitter:image` 与内联 JSON-LD 中的绝对 URL；`sitemap.xml` 的全部条目；`robots.txt` 的 Sitemap 声明。构建完成后的产物 SHALL NOT 残留任何未替换的占位符。

#### Scenario: 六个入口全部注入

- **WHEN** 检查构建产物中首页与五个工具页的 HTML
- **THEN** 每页的 canonical、og:url、og:image、twitter:image 与内联 JSON-LD 均使用配置的 host 与该页自身路径

#### Scenario: 静态资源同步注入

- **WHEN** 检查构建产物中的 `sitemap.xml` 与 `robots.txt`
- **THEN** sitemap 的全部条目与 robots 的 Sitemap 声明均使用配置的 host

#### Scenario: 无残留占位符

- **WHEN** 检查构建产物中的全部文本文件
- **THEN** 不出现未替换的站点 URL 占位符

### Requirement: 产物绝对 URL 的 host 一致性

构建产物中所有出现的站点绝对 URL SHALL 共享同一个 host，且该 host SHALL 等于单一来源定义（或环境变量覆盖）的值。产物 SHALL NOT 出现任何曾在生产使用过、现已废弃的 host。

#### Scenario: host 唯一

- **WHEN** 扫描构建产物中的全部绝对 URL
- **THEN** 其 host 集合只有一个元素，且等于配置值

#### Scenario: 无废弃域名残留

- **WHEN** 扫描构建产物中的全部文本文件
- **THEN** 不出现任何已废弃的历史 host（含 `framecut-offline.douxc512.chatgpt.site`）

### Requirement: 一致性约束可自动验证

产物绝对 URL 的一致性 SHALL 由自动化测试在每次构建后校验；该测试 SHALL 依据单一来源定义进行断言，SHALL NOT 把 host 字面量拷贝进测试代码，使换域名时测试无需修改。

#### Scenario: 测试随构建执行

- **WHEN** 运行项目的测试脚本
- **THEN** 执行站点 URL 一致性校验，并在产物中出现不一致 host、废弃 host 或残留占位符时失败

#### Scenario: 换域名不需改测试

- **WHEN** 单一来源定义被修改为新 host 并重新构建
- **THEN** 一致性校验依然通过，无需修改测试中的任何 host 字面量
