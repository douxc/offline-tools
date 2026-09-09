import {
  navigateToTool,
  TOOL_LABELS,
  TOOL_PATHS,
  type ToolRoute,
} from "@/lib/tool-navigation";

/** 可被列为「相关工具」的全部工具路由（不含首页）。 */
const LINKABLE_TOOLS: readonly ToolRoute[] = [
  "video-frame",
  "video-compress",
  "image-compress",
  "image-watermark",
  "image-a4-layout",
];

export type ToolLinksProps = {
  /** 排除当前工具自身。 */
  exclude?: ToolRoute;
};

/**
 * 相关工具链接（全量 5 工具、排除当前页）。
 * 真实 `<a href>` + 客户端无刷新导航，支持修饰键/中键。
 */
export function ToolLinks({ exclude }: ToolLinksProps) {
  return (
    <nav className="seo-related-links" aria-label="相关离线工具">
      <span>相关工具</span>
      {LINKABLE_TOOLS.filter((route) => route !== exclude).map((route) => (
        <a
          key={route}
          href={TOOL_PATHS[route]}
          onClick={(event) => navigateToTool(event, route)}
        >
          {TOOL_LABELS[route]}
        </a>
      ))}
    </nav>
  );
}
