/**
 * 工具页的模式状态模型(Apple 交互契约 / interaction-modes)。
 *
 * 页面互斥的模式由一个显式状态定义枚举出来,而不是从多个散布的布尔量推导
 * 互相矛盾的可见性。每个模式声明其中有效与无效的操作,界面据此决定主操作。
 *
 * 状态转换(图片处理类工具):
 *
 *   empty --导入--> ready --开始处理--> processing --完成--> complete
 *                     ^                      |                  |
 *                     |                      +--部分失败--> partial
 *                     |                                         |
 *                     +--------重新导入/清空---------------------+
 *                     |                                         |
 *                     +<-----------------导出后/再次处理---------+
 *
 * `partial` 表示部分成功:成功的部分可导出,失败的部分保留在列表中可重试,
 * 已导入的对象与设置不丢失。
 */

export type ToolMode =
  | "empty"
  | "ready"
  | "processing"
  | "partial"
  | "complete";

/** 各模式下的可用操作。界面 SHALL 只呈现该模式下有效的主操作。 */
export type ModeActions = {
  /** 导入/追加文件。 */
  canImport: boolean;
  /** 作为主操作的处理/导出。 */
  canRunPrimary: boolean;
  /** 破坏性的清空/重置。 */
  canClear: boolean;
  /** 导出已完成的结果。 */
  canDownload: boolean;
};

export type ModeState = {
  mode: ToolMode;
  actions: ModeActions;
  /** 处理进度;仅在 processing 模式有意义。 */
  progress: { current: number; total: number } | null;
};

const NO_ACTIONS: ModeActions = {
  canImport: false,
  canRunPrimary: false,
  canClear: false,
  canDownload: false,
};

/**
 * 由当前数据推导模式与可用操作。
 *
 * 纯函数:不读 React 状态,便于对全部模式组合做回归测试。
 *
 * @param assetCount 已导入对象数
 * @param processedCount 已产出结果的对象数
 * @param processing 是否正在处理
 * @param progress 处理进度
 */
export const deriveModeState = ({
  assetCount,
  processedCount,
  processing,
  progress,
}: {
  assetCount: number;
  processedCount: number;
  processing: boolean;
  progress?: { current: number; total: number };
}): ModeState => {
  const hasAssets = assetCount > 0;

  if (processing) {
    return {
      mode: "processing",
      // 处理中不提供导入与清空:避免在批量处理中途改变待处理集合
      actions: { ...NO_ACTIONS, canRunPrimary: false },
      progress: progress ?? { current: 0, total: assetCount },
    };
  }

  if (!hasAssets) {
    // 未导入:唯一的有效操作是导入 —— 不出现导出、清空、处理
    return {
      mode: "empty",
      actions: { ...NO_ACTIONS, canImport: true },
      progress: null,
    };
  }

  const hasResults = processedCount > 0;
  if (!hasResults) {
    return {
      mode: "ready",
      actions: {
        canImport: true,
        canRunPrimary: true,
        canClear: true,
        canDownload: false,
      },
      progress: null,
    };
  }

  const allProcessed = processedCount >= assetCount;
  return {
    mode: allProcessed ? "complete" : "partial",
    actions: {
      canImport: true,
      // 已全部完成时主操作仍可再次执行(改参数后重跑),但不再高亮为唯一动作
      canRunPrimary: true,
      canClear: true,
      canDownload: true,
    },
    progress: null,
  };
};
