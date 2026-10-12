import { ArrowRight, Film, Image, LayoutGrid, ShieldCheck, Video } from "lucide-react";
import { ToolHeader } from "@/components/tool-header";
import { LicenseFooter } from "@/components/license-footer";
import {
  homeToolDescriptionKey,
  homeToolEyebrowKey,
  toolLabelKey,
} from "@/lib/i18n/label-keys";
import { useLocale } from "@/lib/i18n/locale-context";
import { toolHref } from "@/lib/i18n/routes";
import { navigateToTool, type ToolRoute } from "@/lib/tool-navigation";

/**
 * 首页卡片：只保留与语言无关的部分（路由与图标）。
 * 文案统一走词条（`home.toolDescription.*`、`tool.*`、`home.eyebrow*`），
 * 因此新增语言时这里不需要改动。
 */
const tools: Array<{ route: ToolRoute; icon: typeof Video }> = [
  { route: "video-frame", icon: Video },
  { route: "video-compress", icon: Film },
  { route: "image-compress", icon: Image },
  { route: "image-watermark", icon: ShieldCheck },
  { route: "id-photo", icon: Image },
  { route: "image-a4-layout", icon: LayoutGrid },
];

export function ToolHome() {
  const { locale, t } = useLocale();
  return (
    <main className="app-shell tool-home">
      <ToolHeader route="home" />
      <section className="tool-home-hero">
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1>
          {t("home.titleLine1")}
          <br />
          <span>{t("home.titleLine2")}</span>
        </h1>
        <p>{t("home.lead")}</p>
      </section>

      <section className="tool-directory" aria-label={t("home.toolsNavLabel")}>
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <a
              className="tool-directory-card"
              href={toolHref(locale, tool.route)}
              onClick={(event) => navigateToTool(event, tool.route)}
              key={tool.route}
            >
              <div className="tool-card-index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="tool-card-icon" aria-hidden="true">
                <Icon />
              </div>
              <p>{t(homeToolEyebrowKey(tool.route))}</p>
              <h2>{t(toolLabelKey(tool.route))}</h2>
              <span>{t(homeToolDescriptionKey(tool.route))}</span>
              <strong>
                {t("home.openTool")} <ArrowRight size={17} />
              </strong>
            </a>
          );
        })}
      </section>

      <section className="seo-content home-seo-content" aria-labelledby="toolbox-guide">
        <div className="seo-content-heading">
          <p className="eyebrow">{t("home.aboutEyebrow")}</p>
          <h2 id="toolbox-guide">{t("home.toolboxTitle")}</h2>
          <p>{t("home.toolboxBody")}</p>
        </div>
        <div className="seo-detail-grid">
          <article>
            <h3>{t("home.detail.videoTitle")}</h3>
            <p>{t("home.detail.videoBody")}</p>
          </article>
          <article>
            <h3>{t("home.detail.imageTitle")}</h3>
            <p>{t("home.detail.imageBody")}</p>
          </article>
          <article>
            <h3>{t("home.detail.watermarkTitle")}</h3>
            <p>{t("home.detail.watermarkBody")}</p>
          </article>
        </div>
      </section>

      <LicenseFooter />
    </main>
  );
}
