import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";
import { ToolHeader } from "@/components/tool-header";
import { ToolSeoContent } from "@/components/tool-seo-content";
import { ToolTabs } from "@/components/tool-tabs";
import { LicenseFooter } from "@/components/license-footer";
import { Popconfirm } from "@/components/ui/popconfirm";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TextOverlayPanel } from "@/components/text-overlay-panel";
import { BatchSamplingControls } from "@/components/batch-sampling-controls";
import {
  computeTextOverlay,
  drawTextOverlay,
  OVERLAY_DEFAULT_SIZE_RATIO,
  shouldBurnOverlay,
  type OverlayPosition,
} from "@/lib/text-overlay";
import {
  sampleFramesByInterval,
  sampleFramesByStep,
  sampleFramesEvenly,
  type SamplingMode,
} from "@/lib/frame-sampling";
import {
  BATCH_DECODE_CONCURRENCY,
  createFrameZipArchive,
  frameFileName,
} from "@/lib/zip-packer";
import {
  trackBatchFrameExportCancelled,
  trackBatchFrameExportFailed,
  trackBatchFrameExported,
  trackFrameExportFailed,
  trackFrameExported,
} from "@/lib/tool-analytics";

type ImageFormat = "png" | "jpeg" | "webp";

const FPS_OPTIONS = [24, 25, 30, 50, 60];
const DEFAULT_BATCH_INTERVAL = 1;
const DEFAULT_BATCH_STEP = 10;
const DEFAULT_BATCH_COUNT = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTimecode(seconds: number, fps: number) {
  if (!Number.isFinite(seconds)) return "00:00:00:00";
  const safeSeconds = Math.max(0, seconds);
  const wholeSeconds = Math.floor(safeSeconds);
  const frames = Math.min(
    fps - 1,
    Math.floor((safeSeconds - wholeSeconds) * fps),
  );
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;
  return [hours, minutes, secs, frames]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function cleanBaseName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-");
}

export function FrameExtractor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [textEnabled, setTextEnabled] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [overlayPosition, setOverlayPosition] =
    useState<OverlayPosition>("bottom");
  const [overlaySizeRatio, setOverlaySizeRatio] = useState(
    OVERLAY_DEFAULT_SIZE_RATIO,
  );
  const [batchMode, setBatchMode] = useState(false);
  const [samplingMode, setSamplingMode] = useState<SamplingMode>("interval");
  const [batchInterval, setBatchInterval] = useState(DEFAULT_BATCH_INTERVAL);
  const [batchStep, setBatchStep] = useState(DEFAULT_BATCH_STEP);
  const [batchCount, setBatchCount] = useState(DEFAULT_BATCH_COUNT);
  const [batchExporting, setBatchExporting] = useState(false);
  /** 批量导出取消标志:在帧之间同步读取,取消时不产出部分 ZIP。 */
  const cancelBatchRef = useRef(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const timecode = useMemo(
    () => formatTimecode(currentTime, fps),
    [currentTime, fps],
  );

  const releaseVideo = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseVideo, [releaseVideo]);

  const loadFile = useCallback(
    (file?: File) => {
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        toast.error("请选择浏览器支持的视频文件", {
        description: "当前视频未改变，可重新选择 MP4、WebM 或 MOV 文件。",
      });
        return;
      }

      releaseVideo();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setVideoUrl(url);
      setFileName(file.name);
      setFileSize(file.size);
      setDuration(0);
      setCurrentTime(0);
      setDimensions({ width: 0, height: 0 });
      setExported(false);
    },
    [releaseVideo],
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    loadFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const seekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(duration)) return;
      const next = clamp(seconds, 0, duration);
      video.pause();
      setIsPlaying(false);
      video.currentTime = next;
      setCurrentTime(next);
      setExported(false);
    },
    [duration],
  );

  const stepFrame = useCallback(
    (direction: -1 | 1) => {
      seekTo(currentTime + direction / fps);
    },
    [currentTime, fps, seekTo],
  );

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      await video.play();
    } else {
      video.pause();
    }
  };

  const reset = () => {
    releaseVideo();
    setVideoUrl("");
    setFileName("");
    setDuration(0);
    setCurrentTime(0);
    setDimensions({ width: 0, height: 0 });
    setExported(false);
    setIsPlaying(false);
  };

  const exportFrame = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || exporting) return;
    setExporting(true);
    setExported(false);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("无法创建画布");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (shouldBurnOverlay(textEnabled, overlayText)) {
        drawTextOverlay(
          context,
          computeTextOverlay({
            width: canvas.width,
            height: canvas.height,
            text: overlayText,
            position: overlayPosition,
            sizeRatio: overlaySizeRatio,
          }),
        );
      }

      const mime = `image/${format}`;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, format === "png" ? undefined : quality),
      );
      if (!blob) throw new Error("图片编码失败");

      const frameLabel = timecode.replaceAll(":", "-");
      const extension = format === "jpeg" ? "jpg" : format;
      const link = document.createElement("a");
      const imageUrl = URL.createObjectURL(blob);
      link.href = imageUrl;
      link.download = `${cleanBaseName(fileName)}_${frameLabel}.${extension}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
      setExported(true);
      window.setTimeout(() => setExported(false), 2400);
      trackFrameExported({ format });
    } catch {
      trackFrameExportFailed();
      toast.error("当前帧导出失败", {
        description:
          "未产生文件，视频与播放位置保持原样。可尝试其他图片格式后重试。",
      });
    } finally {
      setExporting(false);
    }
  };

  /** Seek the video to `seconds`, wait for the frame to be ready, draw it onto a canvas and return the blob. */
  const captureFrameAt = async (
    video: HTMLVideoElement,
    seconds: number,
  ): Promise<Blob | null> => {
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = seconds;
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建画布");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (shouldBurnOverlay(textEnabled, overlayText)) {
      drawTextOverlay(
        context,
        computeTextOverlay({
          width: canvas.width,
          height: canvas.height,
          text: overlayText,
          position: overlayPosition,
          sizeRatio: overlaySizeRatio,
        }),
      );
    }

    const mime = `image/${format}`;
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, format === "png" ? undefined : quality),
    );
  };

  const sampleTimes = (): number[] => {
    if (!Number.isFinite(duration) || duration <= 0) return [];
    if (samplingMode === "interval") {
      return sampleFramesByInterval(duration, batchInterval);
    }
    if (samplingMode === "step") {
      return sampleFramesByStep(duration, fps, batchStep);
    }
    return sampleFramesEvenly(duration, batchCount);
  };

  const exportBatch = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || batchExporting) return;
    const times = sampleTimes();
    if (times.length === 0) return;

    cancelBatchRef.current = false;
    video.pause();
    setIsPlaying(false);
    setBatchExporting(true);
    setBatchProgress({ current: 0, total: times.length });
    const extension = format === "jpeg" ? "jpg" : format;
    const base = cleanBaseName(fileName);
    const captureVideo: HTMLVideoElement = video;

    async function* frameEntries(): AsyncGenerator<{
      name: string;
      data: Uint8Array;
    }> {
      for (let i = 0; i < times.length; i += BATCH_DECODE_CONCURRENCY) {
        // 取消发生在帧之间:直接中断生成器,createFrameZipArchive 不会产出文件
        if (cancelBatchRef.current) return;
        // Serial decode (BATCH_DECODE_CONCURRENCY === 1): capture, encode, then
        // yield before moving on so peak memory stays near a single frame.
        const blob = await captureFrameAt(captureVideo, times[i]);
        setBatchProgress({ current: i + 1, total: times.length });
        if (!blob) throw new Error("图片编码失败");
        const buffer = await blob.arrayBuffer();
        yield { name: frameFileName(base, i, extension), data: new Uint8Array(buffer) };
      }
    }

    try {
      const zipBlob = await createFrameZipArchive(frameEntries());
      if (cancelBatchRef.current) {
        trackBatchFrameExportCancelled();
        toast.info("已取消导出", {
          description:
            "未产生 ZIP 文件，视频与已选参数保持原样，可随时重新导出。",
        });
        return;
      }
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `${base}_frames.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
      setExported(true);
      window.setTimeout(() => setExported(false), 2400);
      trackBatchFrameExported({
        frames: times.length,
        format,
        samplingMode,
      });
      toast.success(`已导出 ${times.length} 张帧（ZIP）`, {
        description: "文件已保存到浏览器的下载目录。",
      });
    } catch {
      trackBatchFrameExportFailed();
      toast.error("批量抽帧失败", {
        description:
          "未产生 ZIP 文件，已抽出的帧不保留，视频与已选参数保持原样。可缩短范围或减少帧数后重试。",
      });
    } finally {
      setBatchExporting(false);
      cancelBatchRef.current = false;
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    loadFile(event.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!videoUrl) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "BUTTON"
      ) {
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        stepFrame(event.key === "ArrowLeft" ? -1 : 1);
      }
      if (event.code === "Space") {
        event.preventDefault();
        void togglePlayback();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stepFrame, videoUrl]);

  return (
    <main className="app-shell">
      <ToolHeader
        route="video-frame"
        trailing={
          videoUrl ? (
            <Popconfirm
              title="确认重新选择视频？"
              description="当前导入的视频与预览进度将被清除。"
              confirmLabel="重新选择"
              onConfirm={reset}
              trigger={
                <Button
                  variant="outline"
                  type="button"
                >
                  重新选择
                </Button>
              }
            />
          ) : undefined
        }
      />

      <ToolTabs group="video" active="video-frame" />

      {!videoUrl ? (
        <section className="welcome">
          <div className="welcome-copy">
            <p className="eyebrow">在线视频取帧工具</p>
            <h1>
              视频取帧，
              <br />
              <span>定格这一帧。</span>
            </h1>
            <p className="lead">
              导入一段视频，精准移动到你想要的画面，
              <br className="desktop-break" />
              然后以原始分辨率导出成图片。
            </p>
            <div className="feature-row" aria-label="产品特点">
              <span>原画质导出</span>
              <span>逐帧微调</span>
              <span>完全离线</span>
            </div>
          </div>

          <div
            className={`drop-card ${isDragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="drop-visual" aria-hidden="true">
              <span className="corner corner-tl" />
              <span className="corner corner-tr" />
              <span className="corner corner-bl" />
              <span className="corner corner-br" />
              <div className="play-triangle" />
              <div className="scan-line" />
            </div>
            <div className="drop-copy">
              <strong>{isDragging ? "松开即可导入" : "把视频放到这里"}</strong>
              <span>或点击选择本地文件</span>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={() => inputRef.current?.click()}
            >
              选择视频
            </Button>
            <small>支持 MP4、WebM、MOV 等浏览器可播放格式</small>
          </div>

          <div className="privacy-strip">
            <span className="lock-symbol" aria-hidden="true">
              ◉
            </span>
            <div>
              <strong>你的文件不会离开设备</strong>
              <p>视频解码和图片生成均在当前浏览器标签页内完成。</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="editor" aria-label="视频取帧工作台">
          <div className="editor-heading">
            <div>
              <p className="eyebrow">视频画面</p>
              <h1>选取画面</h1>
            </div>
            <div className="file-meta" title={fileName}>
              <span>{fileName}</span>
              <small>
                {(fileSize / 1024 / 1024).toFixed(1)} MB
                {dimensions.width > 0 &&
                  ` · ${dimensions.width} × ${dimensions.height}`}
              </small>
            </div>
          </div>

          <div className="workspace">
            <Card className="viewer-panel">
              <div className="video-stage-shell">
                <div
                  className={`video-stage ${
                    dimensions.width > 0 &&
                    dimensions.width <= dimensions.height
                      ? "is-portrait"
                      : "is-landscape"
                  }`}
                  style={
                    {
                      aspectRatio:
                        dimensions.width > 0 && dimensions.height > 0
                          ? `${dimensions.width} / ${dimensions.height}`
                          : "16 / 9",
                    } as React.CSSProperties
                  }
                >
                  {/* User-selected videos do not provide a caption track. */}
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    preload="auto"
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      setDuration(video.duration);
                      setDimensions({
                        width: video.videoWidth,
                        height: video.videoHeight,
                      });
                    }}
                    onTimeUpdate={(event) =>
                      setCurrentTime(event.currentTarget.currentTime)
                    }
                    onSeeked={(event) =>
                      setCurrentTime(event.currentTarget.currentTime)
                    }
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() =>
                      toast.error(
                        "浏览器无法播放这个视频，请换一种编码或格式。",
                      )
                    }
                    aria-label="视频画面预览"
                  />
                  {shouldBurnOverlay(textEnabled, overlayText) && (
                    <div
                      className={`text-overlay ${
                        overlayPosition === "top" ? "is-top" : "is-bottom"
                      }`}
                      aria-hidden="true"
                    >
                      {overlayText}
                    </div>
                  )}
                  <span className="resolution-badge">
                    {dimensions.width > 0
                      ? `${dimensions.width} × ${dimensions.height}`
                      : "正在读取"}
                  </span>
                  <span className="timecode-badge">{timecode}</span>
                </div>
              </div>

              <div className="timeline-card">
                <div className="timeline-labels">
                  <span>{formatClock(currentTime)}</span>
                  <span>{formatClock(duration)}</span>
                </div>
                <div className="timeline-wrap">
                  <div className="timeline-ticks" aria-hidden="true" />
                  <Slider
                    className="timeline-slider"
                    min={0}
                    max={duration > 0 ? duration : 1}
                    step={0.001}
                    value={[Math.min(currentTime, duration || 0)]}
                    onValueChange={([value]) => seekTo(value)}
                    disabled={!duration}
                    aria-label="视频时间轴"
                  />
                </div>
                <div className="transport">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="transport-button"
                    onClick={() => stepFrame(-1)}
                    aria-label="后退一帧"
                    title="后退一帧（←）"
                  >
                    <span aria-hidden="true">|‹</span>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="play-button"
                    onClick={() => void togglePlayback()}
                    aria-label={isPlaying ? "暂停" : "播放"}
                    title="播放/暂停（空格）"
                  >
                    <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="transport-button"
                    onClick={() => stepFrame(1)}
                    aria-label="前进一帧"
                    title="前进一帧（→）"
                  >
                    <span aria-hidden="true">›|</span>
                  </Button>
                  <div className="fps-control">
                    <span>帧率参考</span>
                    <Select
                      value={String(fps)}
                      onValueChange={(value) => setFps(Number(value))}
                    >
                      <SelectTrigger
                        className="fps-select"
                        aria-label="帧率参考"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FPS_OPTIONS.map((value) => (
                          <SelectItem value={String(value)} key={value}>
                            {value} FPS
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="export-panel" role="complementary">
              <div>
                <p className="panel-number">01</p>
                <h2>当前帧</h2>
                <div className="time-readout">
                  <span>{timecode}</span>
                  <small>时 : 分 : 秒 : 帧</small>
                </div>
              </div>

              <div className="control-group">
                <p className="panel-number">02</p>
                <span>图片格式</span>
                <ToggleGroup
                  type="single"
                  value={format}
                  onValueChange={(next) => {
                    if (next) setFormat(next as ImageFormat);
                  }}
                  aria-label="图片格式"
                  className="w-full"
                >
                  {(["png", "jpeg", "webp"] as ImageFormat[]).map((item) => (
                    <ToggleGroupItem
                      key={item}
                      value={item}
                      className="flex-1 text-xs"
                    >
                      {item === "jpeg" ? "JPG" : item.toUpperCase()}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {format !== "png" && (
                <div className="control-group quality-group">
                  <div className="quality-label">
                    <label htmlFor="quality">图片质量</label>
                    <span>{Math.round(quality * 100)}%</span>
                  </div>
                  <Slider
                    id="quality"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={[quality]}
                    onValueChange={([value]) => setQuality(value)}
                    aria-label="图片质量"
                  />
                </div>
              )}

              <div className="control-group overlay-group">
                <p className="panel-number">03</p>
                <TextOverlayPanel
                  enabled={textEnabled}
                  onEnabledChange={setTextEnabled}
                  text={overlayText}
                  onTextChange={setOverlayText}
                  position={overlayPosition}
                  onPositionChange={setOverlayPosition}
                  sizeRatio={overlaySizeRatio}
                  onSizeRatioChange={setOverlaySizeRatio}
                />
              </div>

              <div className="control-group batch-group">
                <p className="panel-number">04</p>
                <div className="quality-label">
                  <label htmlFor="batch-mode">批量抽帧</label>
                  <Toggle
                    id="batch-mode"
                    variant="outline"
                    size="sm"
                    pressed={batchMode}
                    onPressedChange={setBatchMode}
                    className="font-mono text-xs"
                  >
                    {batchMode ? "已开启" : "关闭"}
                  </Toggle>
                </div>

                {batchMode && (
                  <>
                    <div className="batch-mode-control">
                      <BatchSamplingControls
                        mode={samplingMode}
                        onModeChange={setSamplingMode}
                      />
                    </div>

                    {samplingMode === "interval" && (
                      <div className="quality-group">
                        <div className="quality-label">
                          <label htmlFor="batch-interval">间隔（秒）</label>
                          <span>{batchInterval}s</span>
                        </div>
                        <Slider
                          id="batch-interval"
                          min={0.1}
                          max={Math.max(0.1, duration || 1)}
                          step={0.1}
                          value={[Math.min(batchInterval, duration || 1)]}
                          onValueChange={([value]) => setBatchInterval(value)}
                          aria-label="抽帧间隔秒数"
                        />
                      </div>
                    )}

                    {samplingMode === "step" && (
                      <div className="quality-group">
                        <div className="quality-label">
                          <label htmlFor="batch-step">每 N 帧</label>
                          <span>{batchStep}</span>
                        </div>
                        <Slider
                          id="batch-step"
                          min={1}
                          max={Math.max(1, fps * 5)}
                          step={1}
                          value={[batchStep]}
                          onValueChange={([value]) => setBatchStep(Math.round(value))}
                          aria-label="抽帧帧数步长"
                        />
                      </div>
                    )}

                    {samplingMode === "evenly" && (
                      <div className="quality-group">
                        <div className="quality-label">
                          <label htmlFor="batch-count">张数</label>
                          <span>{batchCount}</span>
                        </div>
                        <Slider
                          id="batch-count"
                          min={1}
                          max={Math.max(1, Math.min(500, Math.floor((duration || 1) * fps)))}
                          step={1}
                          value={[Math.min(batchCount, 500)]}
                          onValueChange={([value]) => setBatchCount(Math.round(value))}
                          aria-label="均匀抽帧张数"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {batchMode ? (
                /* 单槽:导出中在同一位置提供取消,不新增进度行(interaction-modes) */
                batchExporting ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      cancelBatchRef.current = true;
                    }}
                  >
                    <span aria-hidden="true">×</span>
                    停止导出（{batchProgress.current}/{batchProgress.total}）
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => void exportBatch()}
                    disabled={!dimensions.width || !duration}
                  >
                    <span aria-hidden="true">{exported ? "✓" : "↓"}</span>
                    {exported ? "已保存到下载" : "导出批量帧 (ZIP)"}
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void exportFrame()}
                  disabled={exporting || !dimensions.width}
                >
                  <span aria-hidden="true">{exported ? "✓" : "↓"}</span>
                  {exporting
                    ? "正在生成…"
                    : exported
                      ? "已保存到下载"
                      : "导出当前帧"}
                </Button>
              )}
              <p className="export-note">
                {batchMode
                  ? "按所选规则逐帧抽取并打包为 ZIP，每帧按原始分辨率导出。"
                  : "按视频原始分辨率导出，不做缩放或裁剪。"}
              </p>
            </Card>
          </div>

          <div className="shortcut-hint">
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd> 逐帧
            </span>
            <span>
              <kbd>空格</kbd> 播放 / 暂停
            </span>
          </div>
        </section>
      )}

      <ToolSeoContent tool="video" />

      <LicenseFooter />

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="video/*,.mkv"
        onChange={onFileChange}
        tabIndex={-1}
      />
    </main>
  );
}
