"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ImageFormat = "png" | "jpeg" | "webp";

const FPS_OPTIONS = [24, 25, 30, 50, 60];

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
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

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
        setError("请选择浏览器支持的视频文件。");
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
      setError("");
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
    setError("");
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
    } catch {
      setError("当前帧导出失败，请尝试其他图片格式。");
    } finally {
      setExporting(false);
    }
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
      <header className="topbar">
        <a className="brand" href="#" aria-label="帧切首页">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>帧切</span>
        </a>
        <div className="privacy-note">
          <span className="status-dot" aria-hidden="true" />
          本地处理 · 不上传文件
        </div>
        {videoUrl && (
          <button className="ghost-button" type="button" onClick={reset}>
            重新选择
          </button>
        )}
      </header>

      {!videoUrl ? (
        <section className="welcome">
          <div className="welcome-copy">
            <p className="eyebrow">VIDEO FRAME EXTRACTOR</p>
            <h1>
              从视频里，
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
              <p className="eyebrow">FRAME WORKSPACE</p>
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
            <div className="viewer-panel">
              <div className="video-stage">
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
                    setError("浏览器无法播放这个视频，请换一种编码或格式。")
                  }
                  aria-label="视频画面预览"
                />
                <span className="resolution-badge">
                  {dimensions.width > 0
                    ? `${dimensions.width} × ${dimensions.height}`
                    : "正在读取"}
                </span>
                <span className="timecode-badge">{timecode}</span>
              </div>

              <div className="timeline-card">
                <div className="timeline-labels">
                  <span>{formatClock(currentTime)}</span>
                  <span>{formatClock(duration)}</span>
                </div>
                <div className="timeline-wrap">
                  <div className="timeline-ticks" aria-hidden="true" />
                  <input
                    className="timeline"
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.001"
                    value={Math.min(currentTime, duration || 0)}
                    onChange={(event) => seekTo(Number(event.target.value))}
                    aria-label="视频时间轴"
                    style={
                      {
                        "--progress": `${
                          duration ? (currentTime / duration) * 100 : 0
                        }%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
                <div className="transport">
                  <button
                    type="button"
                    className="transport-button"
                    onClick={() => stepFrame(-1)}
                    aria-label="后退一帧"
                    title="后退一帧（←）"
                  >
                    <span aria-hidden="true">|‹</span>
                  </button>
                  <button
                    type="button"
                    className="play-button"
                    onClick={() => void togglePlayback()}
                    aria-label={isPlaying ? "暂停" : "播放"}
                    title="播放/暂停（空格）"
                  >
                    <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
                  </button>
                  <button
                    type="button"
                    className="transport-button"
                    onClick={() => stepFrame(1)}
                    aria-label="前进一帧"
                    title="前进一帧（→）"
                  >
                    <span aria-hidden="true">›|</span>
                  </button>
                  <div className="fps-control">
                    <label htmlFor="fps">帧率参考</label>
                    <select
                      id="fps"
                      value={fps}
                      onChange={(event) => setFps(Number(event.target.value))}
                    >
                      {FPS_OPTIONS.map((value) => (
                        <option value={value} key={value}>
                          {value} FPS
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <aside className="export-panel">
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
                <label>图片格式</label>
                <div className="segmented">
                  {(["png", "jpeg", "webp"] as ImageFormat[]).map((item) => (
                    <button
                      type="button"
                      className={format === item ? "active" : ""}
                      onClick={() => setFormat(item)}
                      key={item}
                    >
                      {item === "jpeg" ? "JPG" : item.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {format !== "png" && (
                <div className="control-group quality-group">
                  <div className="quality-label">
                    <label htmlFor="quality">图片质量</label>
                    <span>{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    id="quality"
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.01"
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                  />
                </div>
              )}

              <button
                className={`export-button ${exported ? "success" : ""}`}
                type="button"
                onClick={() => void exportFrame()}
                disabled={exporting || !dimensions.width}
              >
                <span aria-hidden="true">{exported ? "✓" : "↓"}</span>
                {exporting
                  ? "正在生成…"
                  : exported
                    ? "已保存到下载"
                    : "导出当前帧"}
              </button>
              <p className="export-note">
                按视频原始分辨率导出，不做缩放或裁剪。
              </p>
            </aside>
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

      {error && (
        <div className="error-toast" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="关闭">
            ×
          </button>
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
