import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  navigateToTool,
  TOOL_GROUPS,
  TOOL_LABELS,
  TOOL_PATHS,
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
  const { label, routes } = TOOL_GROUPS[group];
  return (
    <Tabs value={active}>
      <TabsList className="tool-tabs" aria-label={`${label}工具切换`}>
        {routes.map((route) => (
          <TabsTrigger key={route} value={route} asChild>
            <a
              href={TOOL_PATHS[route]}
              onClick={(event) => navigateToTool(event, route)}
            >
              {TOOL_LABELS[route]}
            </a>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
