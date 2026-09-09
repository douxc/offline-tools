import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

const POSITIONS: { value: OverlayPosition; label: string }[] = [
  { value: "bottom", label: "底部居中" },
  { value: "top", label: "顶部居中" },
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

  return (
    <div className="text-overlay-panel">
      <label className="overlay-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span>导出时叠加文字</span>
      </label>

      {enabled && (
        <>
          <label className="text-control">
            <span>字幕文字</span>
            <input
              type="text"
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="输入字幕文字"
              maxLength={60}
            />
          </label>

          <div className="overlay-position-group">
            <span>位置</span>
            <div className="segmented">
              {POSITIONS.map((item) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={position === item.value ? "active" : ""}
                  aria-pressed={position === item.value}
                  onClick={() => onPositionChange(item.value)}
                  key={item.value}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="quality-group">
            <div className="quality-label">
              <label htmlFor="overlay-size">字号</label>
              <span>{Math.round(sizeRatio * 100)}%</span>
            </div>
            <Slider
              id="overlay-size"
              min={0.02}
              max={0.08}
              step={0.01}
              value={[sizeRatio]}
              onValueChange={([value]) => onSizeRatioChange(value)}
              aria-label="字幕字号"
            />
          </div>
        </>
      )}
    </div>
  );
}
