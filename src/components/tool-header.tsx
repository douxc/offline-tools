import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import {
  navigateToTool,
  TOOL_GROUPS,
  TOOL_PATHS,
  toolGroupForRoute,
  type ToolGroup,
  type ToolRoute,
} from "@/lib/tool-navigation";
import { useTheme } from "@/lib/theme";

type ToolHeaderProps = {
  /** 当前路由；首页不属于任何分组（无高亮）。 */
  route: ToolRoute;
  trailing?: ReactNode;
};

export function ToolHeader({ route, trailing }: ToolHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "dark" ? "切换到亮色模式" : "切换到暗色模式";
  const currentGroup = toolGroupForRoute(route);

  return (
    <header className="topbar">
      <a
        className="brand"
        href={TOOL_PATHS.home}
        onClick={(event) => navigateToTool(event, "home")}
        aria-label="离线工具首页"
      >
        <LogoMark className="brand-mark" />
        <span>离线工具</span>
      </a>

      <nav className="tool-nav" aria-label="工具导航">
        {(Object.keys(TOOL_GROUPS) as ToolGroup[]).map((group) => {
          const config = TOOL_GROUPS[group];
          const isCurrent = currentGroup === group;
          return (
            <a
              key={group}
              className={isCurrent ? "active" : ""}
              href={TOOL_PATHS[config.default]}
              onClick={(event) => navigateToTool(event, config.default)}
              aria-current={isCurrent ? "page" : undefined}
            >
              {config.label}
            </a>
          );
        })}
      </nav>

      <div className="header-actions">
        <div className="privacy-note">
          <span className="status-dot" aria-hidden="true" />
          本地处理 · 不上传文件
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label={nextThemeLabel}
          title={nextThemeLabel}
        >
          {theme === "dark" ? (
            <Sun aria-hidden="true" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </Button>
        {trailing}
      </div>
    </header>
  );
}
