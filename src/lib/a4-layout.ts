/**
 * A4 排版打印的纯计算逻辑：页面尺寸、每行张数、页边距与按行流动分页。
 * 该模块不依赖 DOM，可独立做单元测试。
 */

export const A4_PAGE_MM = { width: 210, height: 297 } as const;

/** CSS 96dpi 下的毫米 → 像素换算系数 */
export const MM_TO_PX = 96 / 25.4;

export const A4_PAGE_WIDTH_PX = A4_PAGE_MM.width * MM_TO_PX;
export const A4_PAGE_HEIGHT_PX = A4_PAGE_MM.height * MM_TO_PX;

/** 每行张数（横向列数）的取值范围与默认值 */
export const COLS_PER_ROW = { min: 1, max: 6, default: 3 } as const;

export const MARGIN_MM = { min: 5, max: 25, step: 1, default: 10 } as const;

/** 一张图片参与排版所需的最小信息：宽高比（width / height） */
export type FlowItem = { aspect: number };

/** 一行：图片下标区间 [start, end)（end 为开区间）与该行行高（mm） */
export type FlowRow = { start: number; end: number; rowHeightMm: number };

/** 一页：包含的行下标区间 [start, end)（end 为开区间） */
export type PageSlice = { start: number; end: number };

export type FlowPages = {
  /** 全部行（按列表顺序切分） */
  rows: FlowRow[];
  /** 每页包含的行区间 */
  pageRows: PageSlice[];
};

/** 行高取整到 0.01mm，避免浮点误差放大成打印溢出 */
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * 按每行 cols 张把图片切行，再按行高累加切页。
 *
 * 行规则：同行图片宽度均分（每张 = 内容宽 / cols），行高取该行最高图片的
 * 缩放高度；行高于页面内容高度时收窄为内容高度（该行单独成页）。
 * 页规则：以整行为最小单位换页（放不下下一整行时整行进入下一页），
 * 换页判定含 0.05mm 容差，末页允许不满、不产生空白页。
 */
export function paginateFlow(
  items: readonly FlowItem[],
  cols: number,
  marginMm: number,
  pageMm = A4_PAGE_MM,
): FlowPages {
  if (items.length === 0) return { rows: [], pageRows: [] };

  const contentWidth = pageMm.width - 2 * marginMm;
  const contentHeight = pageMm.height - 2 * marginMm;
  if (contentWidth <= 0 || contentHeight <= 0) {
    return { rows: [], pageRows: [] };
  }

  const safeCols = Math.min(
    COLS_PER_ROW.max,
    Math.max(COLS_PER_ROW.min, Math.floor(cols)),
  );
  const cellWidth = contentWidth / safeCols;

  // 1. 按列表顺序切行
  const rows: FlowRow[] = [];
  for (let index = 0; index < items.length; index += safeCols) {
    const end = Math.min(index + safeCols, items.length);
    let rowHeight = 0;
    for (let offset = index; offset < end; offset += 1) {
      const aspect = items[offset].aspect > 0 ? items[offset].aspect : 1;
      rowHeight = Math.max(rowHeight, cellWidth / aspect);
    }
    rows.push({
      start: index,
      end,
      rowHeightMm: round2(Math.min(rowHeight, contentHeight)),
    });
  }

  // 2. 按行高累加切页（行不跨页）
  const pageRows: PageSlice[] = [];
  let current: PageSlice = { start: 0, end: 0 };
  let usedHeight = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const rowHeight = rows[rowIndex].rowHeightMm;
    if (usedHeight + rowHeight > contentHeight + 0.05) {
      if (current.end > current.start) {
        pageRows.push(current);
        current = { start: rowIndex, end: rowIndex + 1 };
        usedHeight = rowHeight;
      } else {
        // 单行超过内容高度：仍单独成页（行高已在切行时收窄）
        current = { start: rowIndex, end: rowIndex + 1 };
        usedHeight = rowHeight;
      }
    } else {
      current.end = rowIndex + 1;
      usedHeight += rowHeight;
    }
  }
  if (current.end > current.start) pageRows.push(current);

  return { rows, pageRows };
}

/**
 * 把 list[fromIndex] 上移（direction = -1）或下移（direction = 1）一位。
 * 越界或方向无效时返回原列表的浅拷贝（不变）。
 */
export function moveItem<T>(
  list: readonly T[],
  fromIndex: number,
  direction: -1 | 1,
): T[] {
  const toIndex = fromIndex + direction;
  if (fromIndex < 0 || fromIndex >= list.length) return [...list];
  if (toIndex < 0 || toIndex >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** 把 index 收敛到 [0, length - 1]，length 为 0 时返回 0。 */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
