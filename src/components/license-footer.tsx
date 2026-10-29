import { LogoMark } from "@/components/logo-mark";
import { useT } from "@/lib/i18n/locale-context";

/**
 * 全站统一许可页脚：GPL 声明 + 统计说明 + 开源许可/对应源代码链接。
 * ICP 备案页脚（icp-footer）保持独立，不进本组件 —— 备案号是法定标识，不翻译。
 *
 * 统计说明与「本地处理 · 不上传文件」并列出现，使「不上传」的表述在页面存在
 * 第三方统计请求时不产生歧义（见 openspec/specs/analytics 的「对外披露统计」）。
 */
export function LicenseFooter() {
  const t = useT();
  return (
    <footer className="license-footer">
      <div className="license-footer__brand">
        <LogoMark className="license-footer__mark" />
        <span>{t("brand.name")}</span>
      </div>
      <p className="license-footer__line">{t("footer.license")}</p>
      <div className="license-footer__links">
        <span className="license-footer-analytics">
          {t("footer.analyticsNote")}
        </span>
        <a href="/legal/THIRD_PARTY_NOTICES.md">{t("footer.thirdParty")}</a>
        <a href="/legal/CORRESPONDING_SOURCE.md">{t("footer.source")}</a>
      </div>
    </footer>
  );
}
