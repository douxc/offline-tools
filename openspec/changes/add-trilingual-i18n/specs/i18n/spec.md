# Spec Delta

## Purpose

定义站点支持的语言集合、每种语言的规范 URL，以及「当前语言如何被决定与保持」。它同时承载外部站点（www.colors-cc.top 门户）直接链接到目标语言页面的保证、语言切换与跨页面/跨会话的语言保持，以及全部面向用户文案的语言归属，使站点从中文单语变为以英语为默认的中/英/日三语后仍只有一个决定语言的地方。

## ADDED Requirements

### Requirement: 支持语言与规范路径

站点 SHALL 支持三种语言：简体中文（`zh-CN`）、英语（`en`）、日语（`ja`）。英语是站点默认语言，SHALL 使用根路径（无前缀）；日语 SHALL 使用 `/ja` 前缀；中文 SHALL 使用 `/zh` 前缀。站点 SHALL NOT 存在 `/en` 前缀。

#### Scenario: 三种语言的规范路径

- **WHEN** 用户需要访问日语版视频取帧工具
- **THEN** 规范地址为 `/ja/video-frame/`，且该地址返回日语页面

#### Scenario: 英语占据根路径

- **WHEN** 用户访问 `/` 或 `/video-frame/`
- **THEN** 页面为英语，且不产生任何重定向

#### Scenario: 中文使用 zh 前缀

- **WHEN** 用户需要访问中文版视频取帧工具
- **THEN** 规范地址为 `/zh/video-frame/`，且该地址返回中文页面

#### Scenario: 不存在 en 前缀

- **WHEN** 检查产物中的全部路径
- **THEN** 不存在 `/en/` 开头的路径

### Requirement: 语言解析优先级

当前语言 SHALL 由固定优先级解析：URL 路径前缀 > 已保存的语言偏好 > `navigator.language` > 英语。路径前缀属于 URL 明确指定，SHALL 优先于历史保存的偏好。无任何来源可用时 SHALL 回退到英语。站点 SHALL NOT 依赖任何语言查询参数来决定语言。

#### Scenario: 路径优先于已保存偏好

- **WHEN** 已保存偏好为日语的用户打开 `/zh/video-frame/`
- **THEN** 页面为简体中文，且随后保存的偏好更新为简体中文

#### Scenario: 无 URL 指定时遵循已保存偏好

- **WHEN** 已保存偏好为日语的用户直接打开 `/`
- **THEN** 页面为日语

#### Scenario: 无任何来源时回退英语

- **WHEN** 用户既无 URL 语言指定、也无已保存偏好，且浏览器语言不在支持集合内
- **THEN** 页面为英语

#### Scenario: 查询参数不参与语言决定

- **WHEN** 用户访问 `/?lang=ja`
- **THEN** 站点不读取该参数，页面为英语（无其他来源时）

### Requirement: 支持外部直链并保留传入语言

外部站点 SHALL 能够通过链接到规范路径把用户直接送达任意语言的目标页，且该路径携带的语言 SHALL 被完整保留：到达页面的语言 SHALL 等于路径所属语言，SHALL NOT 被用户既有的已保存偏好或浏览器语言覆盖。本站 SHALL NOT 对该访问发起重定向，也 SHALL NOT 依赖任何语言查询参数。

#### Scenario: 门户直链中文工具页

- **WHEN** 用户从 www.colors-cc.top 点击指向 `/zh/video-frame/` 的链接
- **THEN** 用户停留在 `/zh/video-frame/`（不发生重定向），看到中文视频取帧页

#### Scenario: 门户直链日语工具页

- **WHEN** 用户从 www.colors-cc.top 点击指向 `/ja/video-frame/` 的链接
- **THEN** 用户停留在 `/ja/video-frame/`，看到日语视频取帧页

#### Scenario: 直链英语首页

- **WHEN** 用户从外部站点链接到 `/`
- **THEN** 用户看到英语首页，地址仍为 `/`

#### Scenario: 传入语言不被既有偏好覆盖

- **WHEN** 已保存偏好为英语的用户从外部链接进入 `/ja/image-compress/`
- **THEN** 页面为日语，传入的日语设置未被英语偏好覆盖

#### Scenario: 不需要语言参数

- **WHEN** 外部站点使用任意查询参数（含 `?lang=`）链接本站页面
- **THEN** 页面的语言只由路径决定，参数不影响结果

### Requirement: 语言在跳转与再次访问间保持

用户显式选定语言后，跨页面跳转与后续访问 SHALL 保持该语言：站内切换工具页时 SHALL 停留在同一语言，关闭后再次打开站点时 SHALL 沿用该语言，SHALL NOT 因跳转或重新访问而回到英语。语言保持 SHALL 由 URL 路径与已保存偏好共同保证 —— 路径前缀决定当前页语言，偏好决定无前缀路径下呈现的语言。

#### Scenario: 跨页面跳转保持语言

- **WHEN** 用户切换到日语后，在站内连续访问首页与多个工具页
- **THEN** 每次到达的页面均为日语，不回到英语

#### Scenario: 关闭后重新访问保持语言

- **WHEN** 用户切换到中文后关闭页面，之后重新打开 `/`
- **THEN** 页面为简体中文，而非默认英语

#### Scenario: 多次访问之间稳定

- **WHEN** 用户以已保存的中文偏好连续三次打开 `/`
- **THEN** 三次均为简体中文，偏好不漂移

### Requirement: 到达即正确语言且无闪烁

用户到达某个语言路径时，SHALL 直接获得该语言的页面，SHALL NOT 先呈现其他语言再由脚本改写，SHALL NOT 出现语言闪烁或需要客户端重定向。页面的 `<html lang>`、`og:locale`、JSON-LD `inLanguage` 与标题、正文 SHALL 与路径所属语言一致，且在未执行客户端脚本时即已正确。

#### Scenario: 日语路径直接产出日语 HTML

- **WHEN** 抓取 `/ja/video-frame/` 的产物 HTML 而不执行任何脚本
- **THEN** 标题、描述、正文与 `<noscript>` 导航均为日语，`lang` 为 `ja`

#### Scenario: 无语言闪烁

- **WHEN** 用户打开 `/zh/image-compress/`
- **THEN** 首帧即为简体中文，期间不出现英语内容

#### Scenario: 无客户端重定向

- **WHEN** 记录用户打开 `/ja/` 过程中的浏览器导航次数
- **THEN** 不发生任何由语言决定引发的额外导航或地址改写

### Requirement: 站内导航与当前语言一致

站内导航（一级分组、工具 tab、相关工具链接、品牌回首页、语言切换以外的全部链接）SHALL 指向「当前解析出的语言」下的对应工具路径，使点击后的页面语言与点击前一致：解析为中文时带 `/zh` 前缀，解析为日语时带 `/ja` 前缀，解析为英语时无前缀。在不改变语言的前提下点击站内链接 SHALL NOT 触发整页加载。

#### Scenario: 日语页内互跳保持日语

- **WHEN** 用户在 `/ja/video-frame/` 点击二级 tab「動画圧縮」
- **THEN** 到达 `/ja/video-compress/`，仍为日语，且不发生整页加载

#### Scenario: 英语页内互跳保持无前缀

- **WHEN** 用户在 `/video-frame/` 点击相关工具链接
- **THEN** 到达 `/image-compress/`（无语言前缀）

#### Scenario: 中文页内互跳保持 zh 前缀

- **WHEN** 用户在 `/zh/video-frame/` 点击相关工具链接
- **THEN** 到达 `/zh/image-compress/`，仍为简体中文

#### Scenario: 按已保存偏好渲染时链接同语言

- **WHEN** 已保存偏好为中文的用户打开 `/`（页面渲染为简体中文）并点击工具链接
- **THEN** 到达该工具的 `/zh/…` 路径，仍是简体中文，不被打断回英语

#### Scenario: 语言切换以外的链接不改变语言

- **WHEN** 用户依次点击页头分组、二级 tab 与相关工具链接
- **THEN** 每次到达的页面语言都与点击前相同，只有语言切换器会改变语言

### Requirement: 语言切换保持当前工具

每个页面 SHALL 提供语言切换入口，列出全部支持语言并标明当前语言。切换语言 SHALL 保持用户当前所在的工具页。切换入口 SHALL 具备可被辅助技术识别的语义与可见焦点，且 SHALL NOT 仅依赖颜色或图形表达当前语言。

#### Scenario: 切换语言不丢工具

- **WHEN** 用户在 `/video-compress/` 切换到日语
- **THEN** 到达 `/ja/video-compress/`，仍是视频压缩工具

#### Scenario: 切回英语回到根路径

- **WHEN** 用户在 `/ja/video-compress/` 切换到英语
- **THEN** 到达 `/video-compress/`，仍是视频压缩工具

#### Scenario: 列出全部语言并标记当前项

- **WHEN** 用户展开语言切换入口
- **THEN** 列出英语、简体中文、日语三项，当前语言项带选中语义

#### Scenario: 键盘可操作

- **WHEN** 用户以键盘聚焦语言切换入口并操作
- **THEN** 焦点可见，且可用键盘完成语言切换

### Requirement: 语言偏好的保存

用户显式选定的语言 SHALL 被持久保存，使后续不带语言路径前缀的访问沿用该语言。语言偏好 SHALL 与主题偏好等既有本地存储互不覆盖，也 SHALL NOT 被无关的页面访问改写。

#### Scenario: 显式选择被记住

- **WHEN** 用户切换到日语后关闭页面，之后重新打开 `/`
- **THEN** 页面为日语

#### Scenario: 与既有本地存储互不干扰

- **WHEN** 用户切换语言后检查本地存储
- **THEN** 主题等既有键值保持不变

#### Scenario: 偏好只在显式选择时改写

- **WHEN** 用户以已保存的日语偏好在 `/ja/` 与 `/` 之间来回访问
- **THEN** 偏好始终为日语，不因访问英语根路径而被改写为英语

### Requirement: 界面文案按语言输出

全部面向用户的文案（导航、tab、按钮、标签、占位提示、错误与完成反馈、校验提示、无障碍标签、页脚声明）SHALL 以当前语言输出。文案 SHALL 覆盖三种语言的全部界面字符串，使任一种语言下都不出现其他语言的残留文案。

#### Scenario: 任一语言下无他语残留

- **WHEN** 用户分别在三种语言下浏览全部工具页
- **THEN** 界面文案均为当前语言，不出现中文/英语/日语的混排残留

#### Scenario: 反馈与错误同样本地化

- **WHEN** 用户在日语界面触发一次失败操作
- **THEN** 失败提示以日语说明发生了什么、哪些内容未被改变以及可如何恢复

#### Scenario: 无障碍标签本地化

- **WHEN** 用户在中文界面使用辅助技术浏览控件
- **THEN** 控件的无障碍标签为简体中文

### Requirement: 语言前缀不干扰工具路由判定

客户端判定当前工具路由时 SHALL 先剥除语言路径前缀，再匹配工具路径。未经支持语言前缀开头的路径 SHALL 不被当作语言前缀处理，以免产生误判。

#### Scenario: 带前缀仍识别为同一工具

- **WHEN** 用户直接打开 `/ja/image-watermark/`
- **THEN** 渲染图片加水印工具，而非首页

#### Scenario: zh 前缀同样被剥除

- **WHEN** 用户直接打开 `/zh/id-photo/`
- **THEN** 渲染证件照工具，而非首页

#### Scenario: 不支持的前缀不被吞掉

- **WHEN** 用户打开 `/fr/video-frame/`
- **THEN** 该路径不被当作语言前缀解析（不产生「当前语言为法语」的错误状态）

### Requirement: 语言维度的页面元信息

每个语言版本的页面 SHALL 声明与该语言一致的 `<html lang>`、`og:locale`，以及 JSON-LD 中的 `inLanguage`，且这些声明 SHALL 与页面实际语言一致。站点 SHALL 采用单一一套语言标签作为权威取值，使 `lang`、`hreflang` 与 `inLanguage` 三者对该语言的写法互相一致，避免同一语言出现多种标签写法。

#### Scenario: lang 与页面语言一致

- **WHEN** 检查 `/ja/video-frame/` 与 `/zh/image-compress/` 的产物 HTML
- **THEN** `lang` 分别为 `ja` 与 `zh-CN`，`og:locale` 与 JSON-LD `inLanguage` 同步一致

#### Scenario: 英语根路径声明英语

- **WHEN** 检查 `/` 的产物 HTML
- **THEN** `lang`、`hreflang` 与 JSON-LD `inLanguage` 对该语言使用同一个权威标签 `en`

#### Scenario: 同一语言只有一种写法

- **WHEN** 扫描站点的 HTML `lang` 属性、alternate `hreflang` 取值与 JSON-LD `inLanguage`
- **THEN** 每种语言只出现一种标签写法，不存在同一语言的多种写法并存
