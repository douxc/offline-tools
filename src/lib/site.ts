/**
 * 站点对外绝对 URL 的单一来源。
 *
 * 这是全仓库唯一允许出现站点 host 的位置：页面模板、public/ 静态资源与
 * 客户端代码都从这里取值，构建期由 vite.config.ts 注入到产物。
 * 迁移域名时只需改这里的默认值（或在构建环境提供 VITE_SITE_URL 覆盖）。
 *
 * 值不带尾部斜杠，由使用方自行拼接路径。
 */
export const SITE_URL = "https://offline-tools.colors-cc.top";

/** 社交分享卡片图片的绝对 URL（OG/微博等平台不支持相对路径）。 */
export const OG_IMAGE_URL = `${SITE_URL}/og.png`;

/**
 * 构建期占位符。六个 HTML 入口与 public/ 下的 sitemap.xml、robots.txt 用它
 * 标记站点 URL 的插入点，由 vite.config.ts 的站点 URL 插件在构建期替换为
 * resolveSiteUrl() 的结果。
 *
 * 采用双下划线包裹且不含 "." 与协议前缀，因此既能避开与真实文案冲突，
 * 也不会被「产物中的绝对 URL」扫描误判。
 */
export const SITE_URL_TOKEN = "__SITE_URL__";
