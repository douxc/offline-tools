import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToolHeader } from "@/components/tool-header";
import { ToolSeoContent } from "@/components/tool-seo-content";
import { ToolTabs } from "@/components/tool-tabs";
import { useT } from "@/lib/i18n/locale-context";
import { LicenseFooter } from "@/components/license-footer";
import { Popconfirm } from "@/components/ui/popconfirm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  chooseBitrate,
  pickRecorderMime,
  type BitrateLevel,
} from "@/lib/video-export-config";
import { computeScaledDimensions } from "@/lib/video-export-scale";
import {
  trackVideoCompressFailed,
  trackVideoCompressSucceeded,
} from "@/lib/tool-analytics";

type VideoWithCapture = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

/** Best-effort capture of the media element's live stream (audio track source). */
function captureVideoStream(video: VideoWithCapture): MediaStream | null {
  if (typeof video.captureStream === "function") return video.captureStream();
  if (typeof video.mozCaptureStream === "function") {
    return video.mozCaptureStream();
  }
  return null;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export function VideoCompressor() {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [bitrateLevel, setBitrateLevel] = useState<BitrateLevel>("medium");
  const [targetWidthInput, setTargetWidthInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState<{ url: string; size: number } | null>(
    null,
  );
  /** 停止/取消标记：onstop 时丢弃分片，不产出半成品下载。 */
  const discardRef = useRef(false);

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

  useEffect(() => () => {
    // 离开页面（路由切换/卸载）时停止录制并丢弃结果，避免残留 MediaRecorder。
    discardRef.current = true;
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }
    releaseVideo();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (result) URL.revokeObjectURL(result.url);
  }, [releaseVideo, result]);

  const loadFile = useCallback(
    (file?: File) => {
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        toast.error(t("vc.errPickVideo"), {
          description: t("vc.errPickVideoBody"),
        });
        return;
      }
      releaseVideo();
      if (result) {
        URL.revokeObjectURL(result.url);
        setResult(null);
      }
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setVideoUrl(url);
      setFileName(file.name);
      setFileSize(file.size);
      setDuration(0);
      setCurrentTime(0);
      setDimensions({ width: 0, height: 0 });
    },
    [releaseVideo, result, t],
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    loadFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    loadFile(event.dataTransfer.files?.[0]);
  };

  const reset = () => {
    releaseVideo();
    if (result) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }
    setVideoUrl("");
    setFileName("");
    setDuration(0);
    setCurrentTime(0);
    setDimensions({ width: 0, height: 0 });
    setCompressing(false);
  };

  const stopDraw = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const cancelCompress = () => {
    if (recorderRef.current) {
      // 先标记丢弃，onstop 不产出文件也不下载。
      discardRef.current = true;
      if (recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    }
    const video = videoRef.current;
    if (video) video.pause();
    stopDraw();
    setCompressing(false);
    // 与图片处理/批量导出保持一致:取消需说明未产生文件、内容保持原样
    toast.info(t("vc.cancelled"), {
      description: t("vc.cancelledBody"),
    });
  };

  const startCompress = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || compressing) return;
    if (typeof MediaRecorder === "undefined") {
      trackVideoCompressFailed();
      toast.error(t("vc.errNoRecorder"), {
        description: t("vc.errNoRecorderBody"),
      });
      return;
    }
    const mime = pickRecorderMime(
      (candidate) => MediaRecorder.isTypeSupported(candidate),
      true,
    );
    if (!mime) {
      trackVideoCompressFailed();
      toast.error(t("vc.errNoWebm"), {
        description: t("vc.errNoWebmBody"),
      });
      return;
    }

    discardRef.current = false;

    const targetWidth = targetWidthInput
      ? Number(targetWidthInput)
      : undefined;
    const { width, height } = computeScaledDimensions(
      video.videoWidth,
      video.videoHeight,
      Number.isFinite(targetWidth) && targetWidth! > 0 ? targetWidth : undefined,
    );
    const bitrate = chooseBitrate(bitrateLevel);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      trackVideoCompressFailed();
      toast.error(t("vc.errCanvas"));
      return;
    }

    const fps = 30;
    let combined: MediaStream;
    try {
      const canvasStream = canvas.captureStream(fps);
      combined = new MediaStream();
      canvasStream.getVideoTracks().forEach((track) => combined.addTrack(track));
      const captured = captureVideoStream(video as VideoWithCapture);
      if (captured) {
        captured.getAudioTracks().forEach((track) => combined.addTrack(track));
      }
    } catch {
      trackVideoCompressFailed();
      toast.error(t("vc.errCapture"));
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combined, {
        mimeType: mime,
        videoBitsPerSecond: bitrate,
      });
    } catch {
      trackVideoCompressFailed();
      toast.error(t("vc.errRecorder"));
      return;
    }
    recorderRef.current = recorder;
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stopDraw();
      setCompressing(false);
      if (discardRef.current) {
        // 用户取消或页面卸载：丢弃分片，不产出半成品文件。
        chunks.length = 0;
        return;
      }
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      if (result) URL.revokeObjectURL(result.url);
      setResult({ url, size: blob.size });
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.replace(/\.[^.]+$/, "")}_compressed.webm`;
      link.click();
      trackVideoCompressSucceeded({ bytes: blob.size, bitrateLevel });
      toast.success(t("vc.done"), {
        description: t("vc.doneBody", formatBytes(blob.size)),
      });
    };

    setResult(null);
    setCompressing(true);
    recorder.start(1000);
    video.currentTime = 0;
    try {
      await video.play();
    } catch {
      trackVideoCompressFailed();
      toast.error(t("vc.errPlayback"));
      cancelCompress();
      return;
    }

    const draw = () => {
      if (!recorderRef.current || recorderRef.current.state === "inactive") {
        return;
      }
      const v = videoRef.current;
      const cv = canvasRef.current;
      if (v && cv) {
        cv.getContext("2d")?.drawImage(v, 0, 0, cv.width, cv.height);
      }
      if (v && v.ended) {
        try {
          recorderRef.current?.stop();
        } catch {
          // Recorder may already be inactive (e.g. user cancelled).
        }
        return;
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
  };

  const progress =
    duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;
  const reduction =
    result && fileSize > 0
      ? Math.round((1 - result.size / fileSize) * 100)
      : null;

  return (
    <main className="app-shell">
      <ToolHeader
        route="video-compress"
        trailing={
          videoUrl ? (
            <Popconfirm
              title={t("vc.resetTitle")}
              description={t("vc.resetDescription")}
              confirmLabel={t("vc.resetConfirm")}
              onConfirm={reset}
              trigger={
                <Button
                  variant="outline"
                  type="button"
                >
                  {t("vc.resetTrigger")}
                </Button>
              }
            />
          ) : undefined
        }
      />

      <ToolTabs group="video" active="video-compress" />

      {!videoUrl ? (
        <section className="welcome">
          <div className="welcome-copy">
            <p className="eyebrow">{t("vc.eyebrow")}</p>
            <h1>
              {t("vc.titleLine1")}
              <br />
              <span>{t("vc.titleLine2")}</span>
            </h1>
            <p className="lead">
              {t("vc.leadLine1")}
              <br className="desktop-break" />
              {t("vc.leadLine2")}
            </p>
            <div className="feature-row" aria-label={t("vc.featureRowLabel")}>
              <span>{t("vc.featureBitrate")}</span>
              <span>{t("vc.featureScale")}</span>
              <span>{t("vc.featureOffline")}</span>
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
              <strong>{isDragging ? t("vc.dropActive") : t("vc.dropIdle")}</strong>
              <span>{t("vc.dropHint")}</span>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={() => inputRef.current?.click()}
            >
              {t("vc.selectVideo")}
            </Button>
            <small>{t("vc.dropNote")}</small>
          </div>

          <div className="privacy-strip">
            <span className="lock-symbol" aria-hidden="true">
              ◉
            </span>
            <div>
              <strong>{t("vc.privacyTitle")}</strong>
              <p>{t("vc.privacyBody")}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="editor" aria-label={t("vc.editorLabel")}>
          <div className="editor-heading">
            <div>
              <p className="eyebrow">{t("vc.previewEyebrow")}</p>
              <h1>{t("vc.editorTitle")}</h1>
            </div>
            <div className="file-meta" title={fileName}>
              <span>{fileName}</span>
              <small>
                {formatBytes(fileSize)}
                {dimensions.width > 0 &&
                  ` · ${dimensions.width} × ${dimensions.height}`}
              </small>
            </div>
          </div>

          <div className="workspace">
            <Card className="viewer-panel">
              <div className="video-stage-shell">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  preload="auto"
                  onLoadedMetadata={(event) => {
                    const v = event.currentTarget;
                    setDuration(v.duration);
                    setDimensions({
                      width: v.videoWidth,
                      height: v.videoHeight,
                    });
                  }}
                  onTimeUpdate={(event) =>
                    setCurrentTime(event.currentTarget.currentTime)
                  }
                  onError={() =>
                    toast.error(
                      t("vc.errPlaybackBody"),
                    )
                  }
                  aria-label={t("vc.previewLabel")}
                />
              </div>
              {compressing && (
                <div className="timeline-card">
                  <div className="timeline-labels">
                    <span>{t("vc.progress")}</span>
                    <span>{progress}%</span>
                  </div>
                  <div
                    className="timeline-wrap"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "6px",
                        borderRadius: "3px",
                        background: "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>

            <Card className="export-panel" role="complementary">
              <div>
                <p className="panel-number">01</p>
                <h2>{t("vc.optionsTitle")}</h2>
              </div>

              <div className="control-group">
                <p className="panel-number">02</p>
                <span>{t("vc.bitrate")}</span>
                <div className="fps-control">
                  <Select
                    value={bitrateLevel}
                    onValueChange={(value) =>
                      setBitrateLevel(value as BitrateLevel)
                    }
                  >
                    <SelectTrigger className="fps-select" aria-label={t("vc.bitrate")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("vc.bitrateLow")}</SelectItem>
                      <SelectItem value="medium">{t("vc.bitrateMedium")}</SelectItem>
                      <SelectItem value="high">{t("vc.bitrateHigh")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="control-group">
                <p className="panel-number">03</p>
                <span>{t("vc.targetWidth")}</span>
                <input
                  className="settings-input"
                  type="number"
                  min={1}
                  value={targetWidthInput}
                  onChange={(event) => setTargetWidthInput(event.target.value)}
                  placeholder={String(dimensions.width || 0)}
                  aria-label={t("vc.targetWidthLabel")}
                />
              </div>

              {compressing ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={cancelCompress}
                >
                  {t("vc.stop")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void startCompress()}
                  disabled={!dimensions.width}
                >
                  <span aria-hidden="true">↓</span>
                  {t("vc.start")}
                </Button>
              )}

              {result && (
                <div className="control-group">
                  <p className="export-note">
                    {t("vc.exported", formatBytes(result.size))}
                    {reduction !== null &&
                      (reduction >= 0
                        ? t("vc.reduced", Math.abs(reduction))
                        : t("vc.increased", Math.abs(reduction)))}
                  </p>
                </div>
              )}
              <p className="export-note">
                {t("vc.exportNote")}
              </p>
            </Card>
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
