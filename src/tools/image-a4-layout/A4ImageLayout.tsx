import type {
  ChangeEvent,
  CSSProperties,
  DragEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ToolHeader } from "@/components/tool-header";
import { ToolSeoContent } from "@/components/tool-seo-content";
import { useT } from "@/lib/i18n/locale-context";
import { ToolTabs } from "@/components/tool-tabs";
import { LicenseFooter } from "@/components/license-footer";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Popconfirm } from "@/components/ui/popconfirm";
import {
  A4_PAGE_HEIGHT_PX,
  A4_PAGE_WIDTH_PX,
  clampIndex,
  COLS_PER_ROW,
  MARGIN_MM,
  moveItem,
  paginateFlow,
  type FlowRow,
} from "@/lib/a4-layout";
import { trackA4Printed } from "@/lib/tool-analytics";

type A4Item = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
};

/** 导入时解码一次拿到宽高，失败则跳过该文件 */
const loadItem = (file: File): Promise<A4Item | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        file,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/* ------------------------------------------------------------------ */
/* 展示型子组件（与容器解耦，方便服务端渲染测试）                        */
/* ------------------------------------------------------------------ */

export type A4SheetItem = {
  id: string;
  url: string;
  name: string;
  fileSizeLabel?: string;
};

type A4SheetProps = {
  rows: readonly FlowRow[];
  items: readonly A4SheetItem[];
  marginMm: number;
  /** 屏幕端只显示当前页，其余页打上该标记；打印时忽略并全部输出 */
  hiddenOnScreen?: boolean;
  onImageError?: (item: A4SheetItem) => void;
  index: number;
};

/** 一页 A4 版面：210mm × 297mm，内部按行流动布局（行高由布局计算注入）。 */
export function A4Sheet({
  rows,
  items,
  marginMm,
  hiddenOnScreen = false,
  onImageError,
  index,
}: A4SheetProps) {
  const t = useT();
  return (
    <section
      className={`a4-sheet ${hiddenOnScreen ? "a4-sheet-hidden" : ""}`}
      style={{ padding: `${marginMm}mm` }}
      data-page={index + 1}
      aria-label={t("a4.pageLabel", index + 1)}
    >
      {rows.map((row, rowIndex) => (
        <div
          className="a4-flow-row"
          key={rowIndex}
          style={{ "--a4-row-h": `${row.rowHeightMm}mm` } as CSSProperties}
        >
          {items.slice(row.start, row.end).map((item) => (
            <div className="a4-flow-cell" key={item.id}>
              <img
                src={item.url}
                alt={item.name}
                onError={
                  onImageError ? () => onImageError(item) : undefined
                }
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

type A4ImageListProps = {
  items: readonly A4SheetItem[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (item: A4SheetItem) => void;
};

/** 待排版图片列表：缩略图 + 文件名 + 上移/下移/移除。 */
export function A4ImageList({
  items,
  onMove,
  onRemove,
}: A4ImageListProps) {
  const t = useT();
  return (
    <div className="image-list a4-image-list">
      {items.map((item, index) => (
        <div className="a4-list-item" key={item.id}>
          <span className="a4-item-select">
            <img src={item.url} alt="" />
            <span className="image-list-meta">
              <strong>{item.name}</strong>
              <small>
                {t("a4.itemIndex", String(index + 1).padStart(2, "0"))}
                {item.fileSizeLabel}
              </small>
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("a4.moveUp", item.name)}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("a4.moveDown", item.name)}
            disabled={index === items.length - 1}
            onClick={() => onMove(index, 1)}
          >
            <ChevronDown />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={t("a4.remove", item.name)}
            onClick={() => onRemove(item)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}

type A4PaginationBarProps = {
  pageIndex: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
};

/** 翻页控件：第一页禁用上一页、最后一页禁用下一页。 */
export function A4PaginationBar({
  pageIndex,
  pageCount,
  onPrev,
  onNext,
}: A4PaginationBarProps) {
  const t = useT();
  return (
    <div className="a4-pager">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("a4.prevPage")}
        disabled={pageIndex <= 0}
        onClick={onPrev}
      >
        <ChevronLeft />
      </Button>
      <span aria-live="polite">
        {t("a4.pageOf", pageIndex + 1, pageCount)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("a4.nextPage")}
        disabled={pageIndex >= pageCount - 1}
        onClick={onNext}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

type A4ColsPickerProps = {
  value: number;
  onChange: (cols: number) => void;
};

/** 每行张数选择：1–6（横向列数）。 */
export function A4ColsPicker({ value, onChange }: A4ColsPickerProps) {
  const t = useT();
  return (
    <ToggleGroup
      type="single"
      value={String(value)}
      onValueChange={(next) => {
        // 单选 ToggleGroup 再次点击已选项时给出空值,保持原选择
        if (next) onChange(Number(next));
      }}
      aria-label={t("a4.colsPerRow")}
    >
      {Array.from(
        { length: COLS_PER_ROW.max - COLS_PER_ROW.min + 1 },
        (_, index) => COLS_PER_ROW.min + index,
      ).map((cols) => (
        <ToggleGroupItem
          key={cols}
          value={String(cols)}
          aria-label={t("a4.colsOptionLabel", cols)}
          className="flex-1 text-xs"
        >
          {t("a4.colsOptionText", cols)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/* ------------------------------------------------------------------ */
/* 容器组件                                                            */
/* ------------------------------------------------------------------ */

export function A4ImageLayout() {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<A4Item[]>([]);
  const [items, setItems] = useState<A4Item[]>([]);
  const [colsPerRow, setColsPerRow] = useState<number>(COLS_PER_ROW.default);
  const [marginMm, setMarginMm] = useState<number>(MARGIN_MM.default);
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // 按行流动布局：行切分 + 分页全部由纯函数计算
  const flow = useMemo(
    () =>
      paginateFlow(
        items.map((item) => ({ aspect: item.width > 0 ? item.width / item.height : 1 })),
        colsPerRow,
        marginMm,
      ),
    [items, colsPerRow, marginMm],
  );
  const pages = flow.pageRows;
  // 页码始终按有效范围取值（移除图片后页数变少时自动收敛）
  const safePageIndex = clampIndex(pageIndex, pages.length);

  // 预览缩放：A4 页面在预览容器内等比缩小，同时适配容器宽高，最大 100%
  const [offset, setOffset] = useState({ left: 0, top: 0 });
  // 预览区 stage 仅在导入图片后挂载：以 stageReady 驱动效果重跑，
  // 首次测量由 ResizeObserver 的初始异步回调完成（避免在效果体内同步 setState）
  const stageReady = items.length > 0;
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const updateScale = () => {
      const styles = getComputedStyle(element);
      const padLeft = parseFloat(styles.paddingLeft) || 0;
      const padTop = parseFloat(styles.paddingTop) || 0;
      const contentWidth =
        element.clientWidth - padLeft - (parseFloat(styles.paddingRight) || 0);
      const contentHeight =
        element.clientHeight - padTop - (parseFloat(styles.paddingBottom) || 0);
      if (contentWidth <= 0) return;
      const nextScale = Math.min(
        1,
        contentWidth / A4_PAGE_WIDTH_PX,
        contentHeight > 0 ? contentHeight / A4_PAGE_HEIGHT_PX : 1,
      );
      setScale(nextScale);
      setOffset({
        left: padLeft + Math.max(0, (contentWidth - A4_PAGE_WIDTH_PX * nextScale) / 2),
        top: padTop + Math.max(0, (contentHeight - A4_PAGE_HEIGHT_PX * nextScale) / 2),
      });
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, [stageReady]);

  // 卸载时释放所有 objectURL（组件常挂载时仅在退出图片工具分支时发生）
  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.url);
    };
  }, []);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const loaded = await Promise.all(files.map(loadItem));
    const next = loaded.filter((item): item is A4Item => item !== null);
    const failedCount = loaded.length - next.length;
    if (failedCount > 0) {
      toast.error(t("a4.decodeFailed", failedCount), {
        id: "a4-decode-failed",
      });
    }
    if (next.length > 0) {
      setItems((current) => [...current, ...next]);
    }
  }, [t]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const removeItem = (item: A4Item) => {
    URL.revokeObjectURL(item.url);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  };

  const clearAll = () => {
    for (const item of itemsRef.current) URL.revokeObjectURL(item.url);
    setItems([]);
    setPageIndex(0);
  };

  /** 防御性兜底：渲染期解码失败（导入时已校验）时移除并提示 */
  const handleImageError = (item: A4SheetItem) => {
    URL.revokeObjectURL(item.url);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    toast.error(t("a4.decodeFailedOne", item.name), { id: "a4-decode-failed" });
  };

  const handlePrint = () => {
    if (items.length === 0) return;
    trackA4Printed({ pages: pages.length, colsPerRow });
    window.print();
  };

  const listItems: A4SheetItem[] = items.map((item) => ({
    id: item.id,
    url: item.url,
    name: item.file.name,
    fileSizeLabel: formatBytes(item.file.size),
  }));

  const shared = { marginMm, onImageError: handleImageError };

  return (
    <main className="app-shell image-app a4-tool">
      <ToolHeader route="image-a4-layout" />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="a4-file-input"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <section className="image-editor a4-editor">
        <div className="image-heading a4-head">
          <div className="a4-mode-tabs">
            <ToolTabs group="image" active="image-a4-layout" />
          </div>
        </div>

        <div className="a4-actions no-print">
          <Button
            type="button"
            onClick={handlePrint}
            disabled={items.length === 0}
            title={items.length === 0 ? t("a4.printDisabledTitle") : undefined}
          >
            <Printer />
            {t("a4.print", pages.length)}
          </Button>
          <Popconfirm
            title={t("a4.clearTitle")}
            description={t("a4.clearDescription", items.length)}
            confirmLabel={t("a4.clearConfirm")}
            onConfirm={clearAll}
            trigger={
              <Button
                variant="outline"
                type="button"
                disabled={items.length === 0}
              >
                {t("a4.clearTrigger")}
              </Button>
            }
          />
        </div>

        {items.length === 0 ? (
          <div
            className={`image-dropzone ${isDragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="image-drop-icon" aria-hidden="true">
              <ImageIcon />
            </div>
            <strong>{t("a4.emptyTitle")}</strong>
            <span>{t("a4.emptyHint")}</span>
            <Button
              type="button"
              size="lg"
              onClick={() => inputRef.current?.click()}
            >
              {t("a4.selectImages")}
            </Button>
            <small>{t("a4.emptyNote")}</small>
          </div>
        ) : (
          <div className="image-workspace">
            <Card className="image-list-panel">
              <div className="image-panel-title">
                <div>
                  <span>{t("a4.listTitle")}</span>
                  <small>{t("a4.itemCount", items.length)}</small>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  <Plus /> {t("a4.add")}
                </Button>
              </div>
              <A4ImageList
                items={listItems}
                onMove={(index, direction) =>
                  setItems((current) => moveItem(current, index, direction))
                }
                onRemove={(item) => {
                  const target = items.find(
                    (entry) => entry.id === item.id,
                  );
                  if (target) removeItem(target);
                }}
              />
            </Card>

            <Card className="image-preview-panel a4-preview-panel">
              <div className="image-panel-title">
                <div>
                  <span>{t("a4.previewTitle")}</span>
                  <small>
                    {t("a4.previewMeta", marginMm, colsPerRow, flow.rows.length)}
                  </small>
                </div>
                <A4PaginationBar
                  pageIndex={safePageIndex}
                  pageCount={pages.length}
                  onPrev={() => setPageIndex(safePageIndex - 1)}
                  onNext={() => setPageIndex(safePageIndex + 1)}
                />
              </div>
              <div
                className="image-preview-stage a4-preview-stage"
                ref={stageRef}
              >
                <div
                  className="a4-preview-scale"
                  style={{
                    width: A4_PAGE_WIDTH_PX,
                    height: A4_PAGE_HEIGHT_PX,
                    transform: `scale(${scale})`,
                    left: offset.left,
                    top: offset.top,
                  }}
                >
                  {pages.map((page, index) => (
                    <A4Sheet
                      key={index}
                      index={index}
                      rows={flow.rows.slice(page.start, page.end)}
                      items={listItems}
                      hiddenOnScreen={index !== safePageIndex}
                      {...shared}
                    />
                  ))}
                </div>
              </div>
            </Card>

            <Card className="image-settings-panel a4-settings-panel">
              <h2>{t("a4.settingsTitle")}</h2>

              <div className="a4-setting">
                <label htmlFor="a4-cols">{t("a4.colsLabel")}</label>
                <A4ColsPicker value={colsPerRow} onChange={setColsPerRow} />
                <p className="a4-hint">
                  {t("a4.colsHint")}
                </p>
              </div>

              <div className="a4-setting">
                <div className="a4-setting-label">
                  <label htmlFor="a4-margin">{t("a4.margin")}</label>
                  <span>{marginMm} mm</span>
                </div>
                <Slider
                  id="a4-margin"
                  min={MARGIN_MM.min}
                  max={MARGIN_MM.max}
                  step={MARGIN_MM.step}
                  value={[marginMm]}
                  onValueChange={([value]) =>
                    setMarginMm(Math.round(value))
                  }
                />
              </div>
            </Card>
          </div>
        )}
      </section>

      <ToolSeoContent tool="a4" />

      <LicenseFooter />
    </main>
  );
}
