import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToolHeader } from "@/components/tool-header";
import { ToolSeoContent } from "@/components/tool-seo-content";
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
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; size: number } | null>(
    null,
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

  useEffect(() => () => {
    releaseVideo();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (result) URL.revokeObjectURL(result.url);
  }, [releaseVideo, result]);

  const loadFile = useCallback(
    (file?: File) => {
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        setError("请选择浏览器支持的视频文件。");
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
      setError("");
    },
    [releaseVideo, result],
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

  const handleDropKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
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
    setError("");
    setCompressing(false);
  };

  const stopDraw = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const cancelCompress = () => {
    const video = videoRef.current;
    if (video) video.pause();
    stopDraw();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setCompressing(false);
  };

  const startCompress = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || compressing) return;
    if (typeof MediaRecorder === "undefined") {
      setError("当前浏览器不支持 MediaRecorder，无法压缩导出。");
      return;
    }
    const mime = pickRecorderMime(
      (candidate) => MediaRecorder.isTypeSupported(candidate),
      true,
    );
    if (!mime) {
      setError("当前浏览器不支持可用的 WebM 编码，无法压缩导出。");
      return;
    }

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
      setError("无法创建画布。");
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
      setError("无法采集视频流，请换一种视频格式。");
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combined, {
        mimeType: mime,
        videoBitsPerSecond: bitrate,
      });
    } catch {
      setError("无法创建录制器，请换一种视频格式或浏览器。");
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
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      if (result) URL.revokeObjectURL(result.url);
      setResult({ url, size: blob.size });
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.replace(/\.[^.]+$/, "")}_compressed.webm`;
      link.click();
    };

    setError("");
    setResult(null);
    setCompressing(true);
    recorder.start(1000);
    video.currentTime = 0;
    try {
      await video.play();
    } catch {
      setError("无法播放视频进行压缩。");
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
        active="video"
        trailing={
          videoUrl ? (
            <Button
              className="ghost-button"
              variant="outline"
              type="button"
              onClick={reset}
            >
              重新选择
            </Button>
          ) : undefined
        }
      />

      {!videoUrl ? (
        <section className="welcome">
          <div className="welcome-copy">
            <p className="eyebrow">在线视频压缩工具</p>
            <h1>
              视频压缩，
              <br />
              <span>本地完成导出。</span>
            </h1>
            <p className="lead">
              导入一段视频，选择码率与尺寸，
              <br className="desktop-break" />
              在浏览器中重新编码并导出 WebM。
            </p>
            <div className="feature-row" aria-label="产品特点">
              <span>可控码率</span>
              <span>等比缩放</span>
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
            onKeyDown={handleDropKey}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="选择或拖入视频文件"
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
            <span className="primary-button">选择视频</span>
            <small>压缩过程会播放视频并保留原音轨（实验性功能）</small>
          </div>

          <div className="privacy-strip">
            <span className="lock-symbol" aria-hidden="true">
              ◉
            </span>
            <div>
              <strong>你的文件不会离开设备</strong>
              <p>视频解码与重新编码均在当前浏览器标签页内完成。</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="editor" aria-label="视频压缩工作台">
          <div className="editor-heading">
            <div>
              <p className="eyebrow">视频预览</p>
              <h1>压缩导出</h1>
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
                    setError("浏览器无法播放这个视频，请换一种编码或格式。")
                  }
                  aria-label="视频预览"
                />
              </div>
              {compressing && (
                <div className="timeline-card">
                  <div className="timeline-labels">
                    <span>压缩进度</span>
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
                        background: "var(--acid)",
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>

            <Card className="export-panel" role="complementary">
              <div>
                <p className="panel-number">01</p>
                <h2>压缩选项</h2>
              </div>

              <div className="control-group">
                <p className="panel-number">02</p>
                <span>目标码率</span>
                <div className="fps-control">
                  <Select
                    value={bitrateLevel}
                    onValueChange={(value) =>
                      setBitrateLevel(value as BitrateLevel)
                    }
                  >
                    <SelectTrigger className="fps-select" aria-label="目标码率">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低（约 1 Mbps）</SelectItem>
                      <SelectItem value="medium">中（约 2.5 Mbps）</SelectItem>
                      <SelectItem value="high">高（约 6 Mbps）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="control-group">
                <p className="panel-number">03</p>
                <span>目标宽度（可选，留空保持原尺寸）</span>
                <input
                  className="quality-label"
                  type="number"
                  min={1}
                  value={targetWidthInput}
                  onChange={(event) => setTargetWidthInput(event.target.value)}
                  placeholder={String(dimensions.width || 0)}
                  aria-label="目标宽度像素"
                  style={{ width: "100%" }}
                />
              </div>

              {compressing ? (
                <Button
                  className="export-button"
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={cancelCompress}
                >
                  停止压缩
                </Button>
              ) : (
                <Button
                  className="export-button"
                  type="button"
                  size="lg"
                  onClick={() => void startCompress()}
                  disabled={!dimensions.width}
                >
                  <span aria-hidden="true">↓</span>
                  开始压缩导出
                </Button>
              )}

              {result && (
                <div className="control-group">
                  <p className="export-note">
                    已导出 {formatBytes(result.size)}
                    {reduction !== null &&
                      `（较原图 ${reduction >= 0 ? "减小" : "增大"} ${Math.abs(reduction)}%）`}
                  </p>
                </div>
              )}
              <p className="export-note">
                通过 MediaRecorder 实时编码为 WebM，压缩过程会播放一遍视频并保留原音轨。
              </p>
            </Card>
          </div>
        </section>
      )}

      <ToolSeoContent tool="video" />

      {error && (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setError("")}
            aria-label="关闭"
          >
            ×
          </Button>
        </div>
      )}

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
