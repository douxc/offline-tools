/**
 * 全站统一许可页脚：GPL 声明 + 开源许可/对应源代码链接。
 * ICP 备案页脚（icp-footer）保持独立，不进本组件。
 */
export function LicenseFooter() {
  return (
    <footer className="license-footer">
      <span>GPL-3.0-or-later · 本地处理 · 不上传文件</span>
      <a href="/legal/THIRD_PARTY_NOTICES.md">第三方许可</a>
      <a href="/legal/CORRESPONDING_SOURCE.md">对应源代码</a>
    </footer>
  );
}
