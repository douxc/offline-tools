import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupLabelKey, toolLabelKey } from "@/lib/i18n/label-keys";
import { useLocale } from "@/lib/i18n/locale-context";
import { toolHref } from "@/lib/i18n/routes";
import {
  navigateToTool,
  TOOL_GROUPS,
  type ToolGroup,
  type ToolRoute,
} from "@/lib/tool-navigation";

type ToolTabsProps = {
  group: ToolGroup;
  active: ToolRoute;
};

/**
 * 二级工具 tab（shadcn Tabs）：tabs = 当前分组内的工具路由，
 * 选中态由 Radix Tabs 提供（role=tab / aria-selected），
 * 每个 trigger 以 asChild 包裹真实链接，保留中键/Cmd 打开新标签。
 */
export function ToolTabs({ group, active }: ToolTabsProps) {
  const { locale, t } = useLocale();
  const { routes } = TOOL_GROUPS[group];
  return (
    <Tabs value={active}>
      <TabsList
        className="tool-tabs"
        aria-label={t("tabs.label", t(groupLabelKey(group)))}
      >
        {routes.map((route) => (
          <TabsTrigger key={route} value={route} asChild>
            <a
              href={toolHref(locale, route)}
              onClick={(event) => navigateToTool(event, route)}
            >
              {t(toolLabelKey(route))}
            </a>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
