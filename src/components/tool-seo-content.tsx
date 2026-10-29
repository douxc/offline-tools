import { ToolLinks } from "@/components/tool-links";
import { useLocale } from "@/lib/i18n/locale-context";
import { seoLongFormFor, type SeoContentTool } from "@/lib/i18n/seo-long-form";
import type { ToolRoute } from "@/lib/tool-navigation";

type ToolSeoContentProps = {
  tool: SeoContentTool;
};

const TOOL_ROUTE: Record<SeoContentTool, ToolRoute> = {
  video: "video-frame",
  "video-compress": "video-compress",
  compress: "image-compress",
  watermark: "image-watermark",
  a4: "image-a4-layout",
  "id-photo": "id-photo",
} as const;

/**
 * 工具页正文 SEO 长文。
 *
 * 文案在 `src/lib/i18n/seo-long-form.ts`（三语），本组件只负责取当前语言并渲染，
 * 因此新增语言不需要改这里。
 */
export function ToolSeoContent({ tool }: ToolSeoContentProps) {
  const { locale } = useLocale();
  const current = seoLongFormFor(locale, tool);

  return (
    <section className="seo-content" aria-labelledby={`${tool}-seo-title`}>
      <div className="seo-content-heading">
        <h2 id={`${tool}-seo-title`}>{current.title}</h2>
        <p>{current.introduction}</p>
      </div>

      <div className="seo-detail-grid">
        {current.details.map((detail) => (
          <article key={detail.title}>
            <h3>{detail.title}</h3>
            <p>{detail.text}</p>
          </article>
        ))}
      </div>

      <ToolLinks exclude={TOOL_ROUTE[tool]} />
    </section>
  );
}
