import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { navigateToTool, TOOL_PATHS } from "@/lib/tool-navigation";
import { useTheme } from "@/lib/theme";

type ToolHeaderProps = {
  active: "home" | "video" | "image";
  trailing?: ReactNode;
};

export function ToolHeader({ active, trailing }: ToolHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "dark" ? "切换到亮色模式" : "切换到暗色模式";

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
        <a
          className={active === "video" ? "active" : ""}
          href={TOOL_PATHS["video-frame"]}
          onClick={(event) => navigateToTool(event, "video-frame")}
          aria-current={active === "video" ? "page" : undefined}
        >
          视频取帧
        </a>
        <a
          className={active === "image" ? "active" : ""}
          href={TOOL_PATHS["image-compress"]}
          onClick={(event) => navigateToTool(event, "image-compress")}
          aria-current={active === "image" ? "page" : undefined}
        >
          图片处理
        </a>
      </nav>

      <div className="header-actions">
        <div className="privacy-note">
          <span className="status-dot" aria-hidden="true" />
          本地处理 · 不上传文件
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={nextThemeLabel}
          title={nextThemeLabel}
        >
          <Sun className="theme-icon theme-icon-sun" aria-hidden="true" />
          <Moon className="theme-icon theme-icon-moon" aria-hidden="true" />
        </button>
        {trailing}
      </div>
    </header>
  );
}
