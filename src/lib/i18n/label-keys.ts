/**
 * 路由 / 分组 -> 词条键的映射。
 *
 * 工具名与分组名在导航、tab、相关链接、首页多处使用，集中在这里避免各处散落
 * 字符串字面量；配合 `MessageKey` 联合类型，写错键名会在编译期报错。
 */
import type { MessageKey } from "./message-keys";
import type { ToolGroup } from "../tool-navigation";
import type { ToolRoute } from "./tool-routes";

/** 工具显示名。`TOOL_PATHS` 的键与词条键后缀一一对应。 */
export const toolLabelKey = (route: ToolRoute): MessageKey =>
  `tool.${route}` as MessageKey;

/** 一级分组显示名。 */
export const groupLabelKey = (group: ToolGroup): MessageKey =>
  `group.${group}` as MessageKey;

/** 首页卡片描述的键。 */
export const homeToolDescriptionKey = (route: ToolRoute): MessageKey =>
  `home.toolDescription.${route}` as MessageKey;

/** 首页卡片上方的分类标签（比分组更细：水印与打印各成一类）。 */
export const homeToolEyebrowKey = (route: ToolRoute): MessageKey => {
  switch (route) {
    case "video-frame":
    case "video-compress":
      return "home.eyebrowVideo";
    case "image-watermark":
      return "home.eyebrowWatermark";
    case "image-a4-layout":
      return "home.eyebrowPrint";
    default:
      return "home.eyebrowImage";
  }
};
