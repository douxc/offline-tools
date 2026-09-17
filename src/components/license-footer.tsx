/**
 * 全站统一许可页脚：GPL 声明 + 统计说明 + 开源许可/对应源代码链接。
 * ICP 备案页脚（icp-footer）保持独立，不进本组件。
 *
 * 统计说明与「本地处理 · 不上传文件」并列出现，使「不上传」的表述在页面存在
 * 第三方统计请求时不产生歧义（见 openspec/specs/analytics 的「对外披露统计」）。
 */
export function LicenseFooter() {
  return (
    <footer className="license-footer">
      <span>GPL-3.0-or-later · 本地处理 · 不上传文件</span>
      <span className="license-footer-analytics">
        本站使用百度统计做页面访问统计，不涉及文件上传
      </span>
      <a href="/legal/THIRD_PARTY_NOTICES.md">第三方许可</a>
      <a href="/legal/CORRESPONDING_SOURCE.md">对应源代码</a>
    </footer>
  );
}
