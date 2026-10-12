import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/message-keys";
import { LocalizedError, translateError } from "@/lib/i18n/localized-error";
import { ToolHeader } from "@/components/tool-header";
import { ToolSeoContent } from "@/components/tool-seo-content";
import { LicenseFooter } from "@/components/license-footer";
import { ToolTabs } from "@/components/tool-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Popconfirm } from "@/components/ui/popconfirm";
import {
  PngCompressor,
  type PngCompressionStrategy,
} from "@/lib/png-compressor";
import type { ToolRoute } from "@/lib/tool-navigation";
import { deriveModeState } from "@/lib/tool-mode";
import { trackImageProcessingFinished } from "@/lib/tool-analytics";

type ImageMode = "compress" | "watermark";

type ImageAsset = {
  id: string;
  file: File;
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
};

type ProcessedResult = {
  blob: Blob;
  fileName: string;
  originalSize: number;
  outputSize: number;
  /** 结果徽标的**词条键**：渲染处用 t(...) 翻成当前语言。 */
  labelKey: MessageKey;
  contextKey: string;
};

type ImageProcessorProps = {
  initialMode: ImageMode;
  /** 当前路由（compress/watermark），用于分组 tab 选中态与确认文案。 */
  route: ToolRoute;
};

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_PIXELS = 60_000_000;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const baseName = (name: string) =>
  name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-");

const mimeForFile = (file: File) => {
  if (file.type === "image/png" || /\.png$/i.test(file.name)) {
    return "image/png";
  }
  if (file.type === "image/webp" || /\.webp$/i.test(file.name)) {
    return "image/webp";
  }
  return "image/jpeg";
};

const extensionForMime = (mime: string) => {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new LocalizedError("img.errEncode")),
      mime,
      quality,
    );
  });

const drawWatermarkPattern = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  sizePercent: number,
  opacity: number,
  angle: number,
) => {
  const fontSize = Math.max(16, (Math.min(width, height) * sizePercent) / 100);
  const gapY = fontSize * 2.35;

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((angle * Math.PI) / 180);
  context.font = `700 ${fontSize}px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif`;
  const gapX = Math.max(
    fontSize * 4.5,
    context.measureText(text).width * 1.8,
  );
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = Math.max(1.5, fontSize * 0.035);
  context.strokeStyle = `rgba(255,255,255,${(opacity * 0.72).toFixed(3)})`;
  context.fillStyle = `rgba(16,18,16,${(opacity * 0.42).toFixed(3)})`;

  const radius = Math.hypot(width, height);
  for (let y = -radius; y <= radius; y += gapY) {
    const row = Math.round(y / gapY);
    for (let x = -radius; x <= radius; x += gapX) {
      const offset = Math.abs(row % 2) === 1 ? gapX / 2 : 0;
      context.strokeText(text, x + offset, y);
      context.fillText(text, x + offset, y);
    }
  }
  context.restore();
};

const loadImageAsset = (file: File): Promise<ImageAsset> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) {
        URL.revokeObjectURL(url);
        reject(new LocalizedError("img.errTooManyPixels"));
        return;
      }
      resolve({
        id: crypto.randomUUID(),
        file,
        url,
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new LocalizedError("img.errDecode"));
    };
    image.src = url;
  });

/**
 * 压缩策略 -> **词条键**（不是文案）。
 *
 * 这个 helper 在模块作用域，没有 React 上下文，因此只产出键；
 * 渲染处用 `t(...)` 翻成当前语言。
 */
const strategyLabelKey = (
  strategy: PngCompressionStrategy,
): MessageKey => {
  if (strategy === "libimagequant-oxipng") return "img.badgeQuantised";
  if (strategy === "oxipng") return "img.badgeLossless";
  return "img.badgeAlreadyOptimal";
};

export function ImageProcessor({ initialMode, route }: ImageProcessorProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const compressorRef = useRef<PngCompressor | null>(null);
  const assetsRef = useRef<ImageAsset[]>([]);
  const mode = initialMode;
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quality, setQuality] = useState(80);
  // 默认水印文字：用户输入框的初始值，属于**用户数据**而非界面文案，
  // 因此固定为语言无关的占位（空串由 placeholder 提示）。
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkSize, setWatermarkSize] = useState(6);
  const [watermarkOpacity, setWatermarkOpacity] = useState(60);
  const [watermarkAngle, setWatermarkAngle] = useState(-28);
  const [results, setResults] = useState<Record<string, ProcessedResult>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  /** 处理取消标志:在逐张循环之间同步读取,停止后续处理并保留已完成结果。 */
  const cancelProcessingRef = useRef(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const selected = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? assets[0],
    [assets, selectedId],
  );
  // 页面模式由单一状态模型推导(interaction-modes):界面据此决定主操作,
  // 而不是从散布的布尔量组合出互相矛盾的可见性。
  const processedCount = useMemo(
    () => assets.filter((asset) => results[`${asset.id}:${mode}:${quality}`])
      .length,
    [assets, results, mode, quality],
  );
  const modeState = deriveModeState({
    assetCount: assets.length,
    processedCount,
    processing,
    progress,
  });
  const contextKey =
    mode === "compress"
      ? `compress:${quality}`
      : `watermark:${quality}:${watermarkText}:${watermarkSize}:${watermarkOpacity}:${watermarkAngle}`;
  const activeResults = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(results).filter(
          ([, result]) => result.contextKey === contextKey,
        ),
      ),
    [contextKey, results],
  );

  const getCompressor = () => {
    compressorRef.current ??= new PngCompressor();
    return compressorRef.current;
  };

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(
    () => () => {
      for (const asset of assetsRef.current) URL.revokeObjectURL(asset.url);
      compressorRef.current?.dispose();
    },
    [],
  );

  const addFiles = useCallback(async (fileList?: FileList | null) => {
    if (!fileList?.length) return;
    const candidates = Array.from(fileList).filter(
      (file) =>
        ACCEPTED_TYPES.has(file.type) ||
        /\.(png|jpe?g|webp)$/i.test(file.name),
    );
    if (candidates.length === 0) {
      toast.error(t("img.errPickImages"));
      return;
    }

    const settled = await Promise.allSettled(candidates.map(loadImageAsset));
    const loaded = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failures = settled.flatMap((result) =>
      result.status === "rejected" ? [String(result.reason)] : [],
    );

    if (loaded.length > 0) {
      setAssets((current) => [...current, ...loaded]);
      setSelectedId((current) => current || loaded[0].id);
      setResults({});
    }
    if (failures.length > 0) {
      toast.error(t("img.importFailed", failures.length), {
        description: failures[0],
      });
    }
  }, [t]);

  const clearAll = () => {
    for (const asset of assets) URL.revokeObjectURL(asset.url);
    setAssets([]);
    setSelectedId("");
    setResults({});
  };

  const removeAsset = (id: string) => {
    const asset = assets.find((item) => item.id === id);
    if (asset) URL.revokeObjectURL(asset.url);
    setAssets((current) => current.filter((item) => item.id !== id));
    setResults((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (selectedId === id) setSelectedId("");
  };

  const drawWatermarkPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !selected) return;
    const scale = Math.min(1, 1280 / selected.width, 760 / selected.height);
    canvas.width = Math.max(1, Math.round(selected.width * scale));
    canvas.height = Math.max(1, Math.round(selected.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(selected.image, 0, 0, canvas.width, canvas.height);
    drawWatermarkPattern(
      context,
      canvas.width,
      canvas.height,
      watermarkText.trim() || t("img.badgeSample"),
      watermarkSize,
      watermarkOpacity / 100,
      watermarkAngle,
    );
  }, [
    selected,
    watermarkAngle,
    watermarkOpacity,
    watermarkSize,
    watermarkText, t,
  ]);

  useEffect(() => {
    if (mode === "watermark") drawWatermarkPreview();
  }, [drawWatermarkPreview, mode]);

  const compressAsset = async (
    asset: ImageAsset,
  ): Promise<ProcessedResult> => {
    const mime = mimeForFile(asset.file);
    if (mime === "image/png") {
      const result = await getCompressor().compress(asset.file, quality);
      return {
        blob:
          result.strategy === "original"
            ? asset.file
            : new Blob([result.png], { type: "image/png" }),
        fileName: `${baseName(asset.file.name)}.png`,
        originalSize: result.originalSize,
        outputSize: result.outputSize,
        labelKey: strategyLabelKey(result.strategy),
        contextKey,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = asset.width;
    canvas.height = asset.height;
    const context = canvas.getContext("2d");
    if (!context) throw new LocalizedError("img.errCanvas");
    if (mime === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(asset.image, 0, 0);
    const candidate = await canvasToBlob(canvas, mime, quality / 100);
    const useOriginal = candidate.size >= asset.file.size;
    return {
      blob: useOriginal ? asset.file : candidate,
      fileName: `${baseName(asset.file.name)}.${extensionForMime(mime)}`,
      originalSize: asset.file.size,
      outputSize: useOriginal ? asset.file.size : candidate.size,
      labelKey: useOriginal
        ? "img.badgeAlreadyOptimal"
        : mime === "image/webp"
          ? "img.badgeWebpAuto"
          : "img.badgeJpegAuto",
      contextKey,
    };
  };

  const watermarkAsset = async (
    asset: ImageAsset,
  ): Promise<ProcessedResult> => {
    const mime = mimeForFile(asset.file);
    const canvas = document.createElement("canvas");
    canvas.width = asset.width;
    canvas.height = asset.height;
    const context = canvas.getContext("2d");
    if (!context) throw new LocalizedError("img.errCanvas");
    if (mime === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(asset.image, 0, 0);
    drawWatermarkPattern(
      context,
      canvas.width,
      canvas.height,
      watermarkText.trim() || t("img.badgeSample"),
      watermarkSize,
      watermarkOpacity / 100,
      watermarkAngle,
    );
    const blob = await canvasToBlob(
      canvas,
      mime,
      mime === "image/png" ? undefined : quality / 100,
    );
    return {
      blob,
      fileName: `${baseName(asset.file.name)}_watermarked.${extensionForMime(blob.type || mime)}`,
      originalSize: asset.file.size,
      outputSize: blob.size,
      labelKey: "img.badgeOriginalSizeWatermark",
      contextKey,
    };
  };

  const processAll = async () => {
    if (assets.length === 0 || processing) return;
    cancelProcessingRef.current = false;
    setProcessing(true);
    setProgress({ current: 0, total: assets.length });
    const nextResults: Record<string, ProcessedResult> = {};
    let failed = 0;
    let cancelled = false;

    try {
      for (let index = 0; index < assets.length; index += 1) {
        // 取消发生在逐张之间:已完成的图片保留结果,未处理的保持原状
        if (cancelProcessingRef.current) {
          cancelled = true;
          break;
        }
        const asset = assets[index];
        setProgress({ current: index + 1, total: assets.length });
        try {
          nextResults[asset.id] =
            mode === "compress"
              ? await compressAsset(asset)
              : await watermarkAsset(asset);
          setResults({ ...nextResults });
        } catch (error) {
          failed += 1;
          toast.error(`${asset.file.name} ${t("img.errProcessing")}`, {
            description: translateError(t, error) || t("img.errUnknown"),
          });
        }
      }
      // 一次批量处理只上报一次：结局由助手按 failed/total 判定
      // （全部成功 success / 部分失败 partial / 全部失败 failed），取消单列。
      trackImageProcessingFinished({
        mode,
        total: assets.length,
        failed,
        cancelled,
      });
      if (cancelled) {
        // 失败恢复契约:说明已保留的内容与可继续的路径,不丢失已导入对象
        toast.info(t("img.cancelled"), {
          description: t(
            "img.cancelledBody",
            assets.length - Object.keys(nextResults).length,
          ),
        });
      } else if (failed === 0) {
        toast.success(t("img.done", assets.length));
      } else {
        toast.warning(
          t("img.partial", assets.length - failed, failed),
          {
            description: t("img.partialBody"),
          },
        );
      }
    } finally {
      setProcessing(false);
      cancelProcessingRef.current = false;
    }
  };

  const cancelProcessing = () => {
    cancelProcessingRef.current = true;
  };

  const downloadResult = (result: ProcessedResult) => {
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const downloadAll = () => {
    const completed = assets.flatMap((asset) =>
      activeResults[asset.id] ? [activeResults[asset.id]] : [],
    );
    for (const result of completed) downloadResult(result);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  const totalOriginal = Object.values(activeResults).reduce(
    (sum, result) => sum + result.originalSize,
    0,
  );
  const totalOutput = Object.values(activeResults).reduce(
    (sum, result) => sum + result.outputSize,
    0,
  );

  return (
    <main className="app-shell image-app">
      <ToolHeader
        route={route}
        trailing={
          assets.length > 0 ? (
            <Popconfirm
              title={t("img.clearTitle")}
              description={t("img.clearDescription", assets.length)}
              confirmLabel={t("img.clearConfirm")}
              onConfirm={clearAll}
              trigger={
                <Button
                  variant="outline"
                  type="button"
                  disabled={processing}
                >
                  {t("img.clearTrigger")}
                </Button>
              }
            />
          ) : undefined
        }
      />

      <section className="image-editor">
        <div className="image-heading">
          <div>
            <p className="eyebrow">{t("img.eyebrow")}</p>
            <h1>
              {mode === "compress" ? t("img.titleCompress") : t("img.titleWatermark")}
            </h1>
            <p>
              {mode === "compress"
                ? t("img.leadCompress")
                : t("img.leadWatermark")}
            </p>
          </div>
          <ToolTabs group="image" active={route} />
        </div>

        {assets.length === 0 ? (
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
              <Sparkles />
            </div>
            <strong>{t("img.dropIdle")}</strong>
            <span>{t("img.dropHint")}</span>
            <Button
              type="button"
              size="lg"
              onClick={() => inputRef.current?.click()}
            >
              {t("img.selectImages")}
            </Button>
            <small>{t("img.acceptedFormats")}</small>
          </div>
        ) : (
          <div className="image-workspace">
            <Card className="image-list-panel">
              <div className="image-panel-title">
                <div>
                  <span>{t("img.listTitle")}</span>
                  <small>{t("img.itemCount", assets.length)}</small>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={processing}
                >
                  + {t("img.add")}
                </Button>
              </div>
              <div className="image-list">
                {assets.map((asset) => {
                  const result = activeResults[asset.id];
                  return (
                    <div
                      className={`image-list-item ${
                        selected?.id === asset.id ? "active" : ""
                      }`}
                      key={asset.id}
                    >
                      <button
                        className="image-item-select"
                        type="button"
                        aria-pressed={selected?.id === asset.id}
                        onClick={() => setSelectedId(asset.id)}
                      >
                        <img src={asset.url} alt="" />
                        <span className="image-list-meta">
                          <strong>{asset.file.name}</strong>
                          <small>
                            {asset.width} × {asset.height} ·{" "}
                            {formatBytes(asset.file.size)}
                          </small>
                          {result && (
                            <small className="result-label">
                              <Check size={12} /> {t(result.labelKey)}
                            </small>
                          )}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`${t("img.remove")} ${asset.file.name}`}
                        onClick={() => removeAsset(asset.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="image-preview-panel">
              <div className="image-panel-title">
                <div>
                  <span>{mode === "compress" ? t("img.previewOriginal") : t("img.previewWatermark")}</span>
                  <small>
                    {selected
                      ? `${selected.width} × ${selected.height}`
                      : t("img.noneSelected")}
                  </small>
                </div>
              </div>
              <div className="image-preview-stage">
                {selected &&
                  (mode === "watermark" ? (
                    <canvas
                      ref={previewCanvasRef}
                      aria-label={t("img.previewLabel")}
                    />
                  ) : (
                    <img src={selected.url} alt={selected.file.name} />
                  ))}
                {processing && (
                  <div className="processing-overlay" role="status">
                    <LoaderCircle size={25} />
                    <span>
                      {t("img.processing")} {progress.current} / {progress.total}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="image-settings-panel">
              <p className="panel-number">01</p>
              <h2>{mode === "compress" ? t("img.compressSettings") : t("img.watermarkText")}</h2>

              {mode === "watermark" && (
                <label className="text-control">
                  <span>{t("img.watermarkTextLabel")}</span>
                  <input
                    value={watermarkText}
                    maxLength={60}
                    onChange={(event) => setWatermarkText(event.target.value)}
                    disabled={processing}
                  />
                </label>
              )}

              <div className="image-slider-control">
                <div>
                  <label htmlFor="image-quality">
                    {mode === "compress" ? t("img.compressQuality") : t("img.outputQuality")}
                  </label>
                  <span>{quality}%</span>
                </div>
                <Slider
                  id="image-quality"
                  min={10}
                  max={100}
                  step={1}
                  value={[quality]}
                  onValueChange={([value]) => setQuality(value)}
                  disabled={processing}
                />
              </div>

              {mode === "watermark" && (
                <>
                  <div className="image-slider-control">
                    <div>
                      <label htmlFor="watermark-size">{t("img.fontSize")}</label>
                      <span>{watermarkSize}%</span>
                    </div>
                    <Slider
                      id="watermark-size"
                      min={2}
                      max={16}
                      step={1}
                      value={[watermarkSize]}
                      onValueChange={([value]) => setWatermarkSize(value)}
                      disabled={processing}
                    />
                  </div>
                  <div className="image-slider-control">
                    <div>
                      <label htmlFor="watermark-opacity">{t("img.watermarkStrength")}</label>
                      <span>{watermarkOpacity}%</span>
                    </div>
                    <Slider
                      id="watermark-opacity"
                      min={5}
                      max={100}
                      step={1}
                      value={[watermarkOpacity]}
                      onValueChange={([value]) => setWatermarkOpacity(value)}
                      disabled={processing}
                    />
                  </div>
                  <div className="image-slider-control">
                    <div>
                      <label htmlFor="watermark-angle">{t("img.angle")}</label>
                      <span>{watermarkAngle}°</span>
                    </div>
                    <Slider
                      id="watermark-angle"
                      min={-60}
                      max={60}
                      step={1}
                      value={[watermarkAngle]}
                      onValueChange={([value]) => setWatermarkAngle(value)}
                      disabled={processing}
                    />
                  </div>
                </>
              )}

              <div className="image-processing-note">
                <span className="status-dot" />
                {mode === "compress"
                  ? t("img.compressNote")
                  : t("img.watermarkNote")}
              </div>

              {/* 单槽:处理中在同一位置提供取消,不新增进度行(interaction-modes) */}
              {modeState.mode === "processing" ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={cancelProcessing}
                >
                  <LoaderCircle className="spin" />
                  {t(
                    "img.stop",
                    modeState.progress?.current ?? 0,
                    modeState.progress?.total ?? assets.length,
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void processAll()}
                >
                  <Sparkles />
                  {t("img.processAll", assets.length)}
                </Button>
              )}

              {modeState.actions.canDownload && (
                <div className="image-results-summary">
                  <div>
                    <span>
                      {t("img.doneCount", Object.keys(activeResults).length)}
                      {modeState.mode === "partial" &&
                        ` · ${t(
                          "img.retryCount",
                          assets.length - Object.keys(activeResults).length,
                        )}`}
                    </span>
                    <small>
                      {mode === "compress"
                        ? t(
                            "img.savedBytes",
                            formatBytes(Math.max(0, totalOriginal - totalOutput)),
                          )
                        : t("img.outputBytes", formatBytes(totalOutput))}
                    </small>
                  </div>
                  <Button type="button" size="sm" onClick={downloadAll}>
                    <Download />
                    {t("img.downloadAll")}
                  </Button>
                </div>
              )}

              {selected && activeResults[selected.id] && (
                <Button
                  className="download-current"
                  type="button"
                  variant="outline"
                  onClick={() => downloadResult(activeResults[selected.id])}
                >
                  <Download />
                  {t("img.downloadCurrent")}
                </Button>
              )}
            </Card>
          </div>
        )}
      </section>

      <ToolSeoContent tool={mode} />

      <LicenseFooter />

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
        tabIndex={-1}
      />
    </main>
  );
}
