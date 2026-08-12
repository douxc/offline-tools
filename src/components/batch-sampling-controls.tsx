import type { MouseEvent } from "react";
import type { SamplingMode } from "@/lib/frame-sampling";

interface BatchSamplingControlsProps {
  mode: SamplingMode;
  onModeChange: (mode: SamplingMode) => void;
}

const OPTIONS: ReadonlyArray<{ mode: SamplingMode; label: string }> = [
  { mode: "interval", label: "按时间间隔" },
  { mode: "step", label: "按帧数间隔" },
  { mode: "evenly", label: "均匀取张数" },
];

/**
 * Segmented control that selects how a batch of frames is sampled from the
 * video: by a fixed time interval, by a frame-count step, or evenly spread.
 */
export function BatchSamplingControls({
  mode,
  onModeChange,
}: BatchSamplingControlsProps) {
  const select = (event: MouseEvent<HTMLButtonElement>, next: SamplingMode) => {
    event.preventDefault();
    onModeChange(next);
  };

  return (
    <div className="segmented" role="group" aria-label="抽取模式">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          className={mode === option.mode ? "active" : ""}
          aria-pressed={mode === option.mode}
          onClick={(event) => select(event, option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
