import type { SamplingMode } from "@/lib/frame-sampling";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/message-keys";

interface BatchSamplingControlsProps {
  mode: SamplingMode;
  onModeChange: (mode: SamplingMode) => void;
}

const OPTIONS: ReadonlyArray<{ mode: SamplingMode; labelKey: MessageKey }> = [
  { mode: "interval", labelKey: "sampling.byInterval" },
  { mode: "step", labelKey: "sampling.byStep" },
  { mode: "evenly", labelKey: "sampling.byCount" },
];

/**
 * Segmented control that selects how a batch of frames is sampled from the
 * video: by a fixed time interval, by a frame-count step, or evenly spread.
 *
 * 由 shadcn ToggleGroup 承载,选中态由 `data-state` 表达。
 */
export function BatchSamplingControls({
  mode,
  onModeChange,
}: BatchSamplingControlsProps) {
  const t = useT();
  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(next) => {
        // 单选 ToggleGroup 在再次点击已选项时会给出空值,此处保持原选择
        if (next) onModeChange(next as SamplingMode);
      }}
      aria-label={t("sampling.mode")}
      className="w-full"
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.mode}
          value={option.mode}
          className="flex-1 text-xs"
        >
          {t(option.labelKey)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
