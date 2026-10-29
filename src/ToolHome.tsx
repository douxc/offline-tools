import { ToolHeader } from "@/components/tool-header";
import { LicenseFooter } from "@/components/license-footer";
import { toolLabelKey } from "@/lib/i18n/label-keys";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/message-keys";
import { toolHref } from "@/lib/i18n/routes";
import { TOOL_ROUTES, type ToolRoute } from "@/lib/i18n/tool-routes";
import { navigateToTool } from "@/lib/tool-navigation";

/**
 * 首页：工具索引。首屏（Index hero）就是六个工具：
 * 标题与一个「切帧」主操作之后直接是六行“输入 → 这个标签页 → 输出”地图，
 * 每一行都是真实工具链接；窄屏三列、手机两列的工具格，六项仍然落在首屏。
 *
 * 压缩样本的数字来自实际运行：public/og.png（895,139 B，1200 × 630）
 * 经图片压缩工具得到 public/samples/og.png（125,452 B），2026-10-28 测量。
 */
const SAMPLE = {
  original: "874 KB",
  compressed: "123 KB",
  saved: "86%",
  width: 1200,
  height: 630,
} as const;

const TOOLS: readonly { route: ToolRoute }[] = TOOL_ROUTES.filter(
  (route) => route !== "home",
).map((route) => ({ route }));

const NOTES = [
  { title: "home.detail.videoTitle", body: "home.detail.videoBody" },
  { title: "home.detail.imageTitle", body: "home.detail.imageBody" },
  { title: "home.detail.watermarkTitle", body: "home.detail.watermarkBody" },
] as const satisfies ReadonlyArray<{ title: MessageKey; body: MessageKey }>;

export function ToolHome() {
  const { locale, t } = useLocale();
  const mapKey = (prefix: string, route: ToolRoute) =>
    `${prefix}.${route}` as MessageKey;

  return (
    <main className="app-shell tool-home">
      <ToolHeader route="home" />

      <section
        className="home-hero home-hero--index"
        aria-labelledby="home-title"
      >
        <div className="home-hero__inner">
          <h1 id="home-title" className="home-hero__head">
            {t("home.titleLine1")}
            <span className="home-hero__sub">{t("home.titleLine2")}</span>
          </h1>
          <a
            className="home-hero__action btn btn--primary"
            href={toolHref(locale, "video-frame")}
            onClick={(event) => navigateToTool(event, "video-frame")}
          >
            {t("home.heroPrimary")}
          </a>
        </div>

        <section
          id="tools"
          className="home-index"
          aria-label={t("home.mapTitle")}
        >

          <div className="map-ruler" aria-hidden="true">
            <span>{t("home.mapInLabel")}</span>
            <span>
              {t("home.mapToolLabel")}
              <small>{t("home.mapTabLabel")}</small>
            </span>
            <span>{t("home.mapOutLabel")}</span>
          </div>

          <ul className="format-map">
            {TOOLS.map((tool) => (
              <li className="map-row" key={tool.route}>
                <a
                  className="map-row__link"
                  href={toolHref(locale, tool.route)}
                  onClick={(event) => navigateToTool(event, tool.route)}
                >
                  <span className="map-in">
                    <span className="map-label">{t("home.mapInLabel")}</span>
                    {t(mapKey("home.mapIn", tool.route))}
                  </span>
                  <span className="map-tool">
                    <strong>{t(toolLabelKey(tool.route))}</strong>
                    <small>{t(mapKey("home.mapLine", tool.route))}</small>
                  </span>
                  <span className="map-out">
                    <span className="map-label">{t("home.mapOutLabel")}</span>
                    {t(mapKey("home.mapOut", tool.route))}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="map-note">{t("home.mapNote")}</p>
        </section>
      </section>

      <section className="home-notes" aria-labelledby="toolbox-guide">
        <div className="container">
          <div className="home-notes__head">
            <h2 id="toolbox-guide">{t("home.toolboxTitle")}</h2>
            <p>{t("home.toolboxBody")}</p>
          </div>
          <div className="notes-rows">
            {NOTES.map((note) => (
              <article key={note.title}>
                <h3>{t(note.title)}</h3>
                <p>{t(note.body)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-proof" aria-labelledby="proof-title">
        <div className="container home-proof__grid">
          <div className="proof-copy">
            <h2 id="proof-title">{t("home.proofTitle")}</h2>
            <p className="lead">{t("home.proofLead")}</p>
            <dl className="proof-figures">
              <div>
                <dt>{t("home.proofBefore")}</dt>
                <dd>{SAMPLE.original}</dd>
              </div>
              <div>
                <dt>{t("home.proofAfter")}</dt>
                <dd>{SAMPLE.compressed}</dd>
              </div>
              <div>
                <dt>{t("home.proofSaved")}</dt>
                <dd>{SAMPLE.saved}</dd>
              </div>
            </dl>
            <div className="proof-actions">
              <a
                className="btn btn--primary"
                href={toolHref(locale, "image-compress")}
                onClick={(event) => navigateToTool(event, "image-compress")}
              >
                {t("home.proofAction")}
              </a>
              <a
                className="proof-download"
                href="/samples/og.png"
                download="og-compressed.png"
              >
                {t("home.proofDownload")}
              </a>
            </div>
          </div>
          <figure className="proof-frame">
            <img
              src="/samples/og.png"
              alt={t("home.proofAlt")}
              width={SAMPLE.width}
              height={SAMPLE.height}
              loading="lazy"
              decoding="async"
            />
            <figcaption>{t("home.proofCaption")}</figcaption>
          </figure>
        </div>
      </section>

      <LicenseFooter />
    </main>
  );
}
