import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/message-keys";
import { type OverlayPosition } from "@/lib/text-overlay";

export interface TextOverlayPanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  text: string;
  onTextChange: (text: string) => void;
  position: OverlayPosition;
  onPositionChange: (position: OverlayPosition) => void;
  sizeRatio: number;
  onSizeRatioChange: (sizeRatio: number) => void;
}

const POSITIONS: { value: OverlayPosition; labelKey: MessageKey }[] = [
  { value: "bottom", labelKey: "overlay.positionBottom" },
  { value: "top", labelKey: "overlay.positionTop" },
];

export function TextOverlayPanel(props: TextOverlayPanelProps) {
  const {
    enabled,
    onEnabledChange,
    text,
    onTextChange,
    position,
    onPositionChange,
    sizeRatio,
    onSizeRatioChange,
  } = props;
  const t = useT();

  return (
    <div className="text-overlay-panel">
      <label className="overlay-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span>{t("overlay.title")}</span>
      </label>

      {enabled && (
        <>
          <label className="text-control">
            <span>{t("overlay.textLabel")}</span>
            <input
              type="text"
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder={t("overlay.textPlaceholder")}
              maxLength={60}
            />
          </label>

          <div className="overlay-position-group">
            <span>{t("overlay.position")}</span>
            <ToggleGroup
              type="single"
              value={position}
              onValueChange={(next) => {
                if (next) onPositionChange(next as typeof position);
              }}
              aria-label={t("overlay.textAriaLabel")}
              className="w-full"
            >
              {POSITIONS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="flex-1 text-xs"
                >
                  {t(item.labelKey)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="quality-group">
            <div className="quality-label">
              <label htmlFor="overlay-size">{t("overlay.size")}</label>
              <span>{Math.round(sizeRatio * 100)}%</span>
            </div>
            <Slider
              id="overlay-size"
              min={0.02}
              max={0.08}
              step={0.01}
              value={[sizeRatio]}
              onValueChange={([value]) => onSizeRatioChange(value)}
              aria-label={t("overlay.sizeLabel")}
            />
          </div>
        </>
      )}
    </div>
  );
}
