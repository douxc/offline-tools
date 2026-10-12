import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { cropGeometry, moveCrop, type CropPosition, type Dimensions } from "@/lib/id-photo-geometry";
import type { PhotoAsset } from "@/lib/id-photo-assets";
import { useT } from "@/lib/i18n/locale-context";

export function CropPreview({ asset, target, disabled, onChange }: {
  asset: PhotoAsset; target: Dimensions; disabled: boolean; onChange: (crop: CropPosition) => void;
}) {
  const t = useT();
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; crop: CropPosition } | null>(null);
  const [view, setView] = useState({ width: 520, height: 520 });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width > 0 && height > 0) setView({ width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, []);
  const frameWidth = Math.max(1, Math.min(view.width - 64, (view.height - 64) * target.width / target.height));
  const frameHeight = frameWidth * target.height / target.width;
  const left = (view.width - frameWidth) / 2, top = (view.height - frameHeight) / 2;
  const { rect, scale } = cropGeometry(asset, target, asset.crop);
  const display = frameWidth / target.width;
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const deltas: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    onChange(moveCrop(asset, target, asset.crop, delta[0] * step, delta[1] * step));
  };
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- This focusable crop application implements pointer and keyboard editing, not a static container.
    <div ref={stageRef} className="id-photo-stage" role="application" tabIndex={disabled ? -1 : 0}
      aria-label={t("idPhoto.cropPreviewLabel")} aria-describedby="id-photo-crop-help" aria-disabled={disabled}
      onKeyDown={onKeyDown}
      onPointerDown={event => {
        if (disabled || !event.isPrimary || event.button !== 0) return;
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, crop: asset.crop };
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (disabled || !start || start.id !== event.pointerId) return;
        onChange(moveCrop(asset, target, start.crop, event.clientX - start.x, event.clientY - start.y, frameWidth));
      }} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { drag.current = null; }}
    >
      <img className="id-photo-crop-image" src={asset.url} alt="" draggable={false}
        style={{ width: asset.width * scale * display, height: asset.height * scale * display,
          left: left - rect.x * scale * display, top: top - rect.y * scale * display }} />
      <div className="id-photo-crop-frame" aria-hidden="true" style={{ width: frameWidth, height: frameHeight, left, top }} />
    </div>
  );
}
