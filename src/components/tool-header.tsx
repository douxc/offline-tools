import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { groupLabelKey } from "@/lib/i18n/label-keys";
import { useLocale } from "@/lib/i18n/locale-context";
import { toolHref } from "@/lib/i18n/routes";
import {
  navigateToTool,
  TOOL_GROUPS,
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

/**
 * 站点页头：一条事实横幅，压在一条随滚动固定的导航条上。
 *
 * 横幅只放「本地处理」这一条事实（不是公告栏）；导航条承载品牌、分组、
 * 语言与主题。分组链接保留 aria-current，语言切换与主题切换的接线不变。
 */
export function ToolHeader({ route, trailing }: ToolHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { locale, t } = useLocale();
  const nextThemeLabel =
    theme === "dark" ? t("header.themeToLight") : t("header.themeToDark");
  const currentGroup = toolGroupForRoute(route);

  return (
    <header className="site-header">
      <div className="privacy-banner">
        <p>{t("header.privacyNote")}</p>
      </div>

      <div className="topbar">
        <a
          className="brand"
          href={toolHref(locale, "home")}
          onClick={(event) => navigateToTool(event, "home")}
          aria-label={t("brand.homeLabel")}
        >
          <LogoMark className="brand-mark" />
          <span>{t("brand.name")}</span>
        </a>

        <nav className="tool-nav" aria-label={t("header.navLabel")}>
          {(Object.keys(TOOL_GROUPS) as ToolGroup[]).map((group) => {
            const config = TOOL_GROUPS[group];
            const isCurrent = currentGroup === group;
            return (
              <a
                key={group}
                className={isCurrent ? "active" : ""}
                href={toolHref(locale, config.default)}
                onClick={(event) => navigateToTool(event, config.default)}
                aria-current={isCurrent ? "page" : undefined}
              >
                {t(groupLabelKey(group))}
              </a>
            );
          })}
        </nav>

        <div className="header-actions">
          <LanguageSwitcher />
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
      </div>
    </header>
  );
}
