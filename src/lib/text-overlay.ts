export type OverlayPosition = "top" | "bottom";

export interface ComputeTextOverlayInput {
  width: number;
  height: number;
  text: string;
  position: OverlayPosition;
  sizeRatio: number;
}

export interface TextOverlayDescriptor {
  text: string;
  font: string;
  color: string;
  stroke: string;
  lineWidth: number;
  x: number;
  y: number;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

/** Minimal canvas-2D surface the overlay draws onto (mockable in Node). */
export interface TextOverlayCtx {
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  strokeText(text: string, x: number, y: number): void;
  fillText(text: string, x: number, y: number): void;
}

export const OVERLAY_FONT_FAMILY =
  '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
export const OVERLAY_MARGIN_RATIO = 0.03;
export const OVERLAY_DEFAULT_SIZE_RATIO = 0.04;

/**
 * Compute a deterministic text-overlay draw descriptor for a canvas of the
 * given pixel dimensions. The text is centered horizontally; position selects
 * the top or bottom band. Font size scales linearly with canvas height.
 */
export function computeTextOverlay(
  input: ComputeTextOverlayInput,
): TextOverlayDescriptor {
  const { width, height, text, position, sizeRatio } = input;
  const fontPx = Math.max(1, Math.round(height * sizeRatio));
  const margin = Math.round(height * OVERLAY_MARGIN_RATIO);
  const x = width / 2;
  const y =
    position === "top"
      ? margin + fontPx / 2
      : height - margin - fontPx / 2;
  return {
    text,
    font: `${fontPx}px ${OVERLAY_FONT_FAMILY}`,
    color: "rgba(255,255,255,0.96)",
    stroke: "rgba(0,0,0,0.8)",
    lineWidth: Math.max(2, Math.round(fontPx / 8)),
    x,
    y,
    textAlign: "center",
    textBaseline: "middle",
  };
}

/** Draw the overlay onto a 2D context: outline first, then fill. */
export function drawTextOverlay(
  ctx: TextOverlayCtx,
  overlay: TextOverlayDescriptor,
) {
  ctx.font = overlay.font;
  ctx.textAlign = overlay.textAlign;
  ctx.textBaseline = overlay.textBaseline;
  ctx.strokeStyle = overlay.stroke;
  ctx.lineWidth = overlay.lineWidth;
  ctx.fillStyle = overlay.color;
  ctx.strokeText(overlay.text, overlay.x, overlay.y);
  ctx.fillText(overlay.text, overlay.x, overlay.y);
}

/** Whether an exported frame should carry the text overlay. */
export function shouldBurnOverlay(enabled: boolean, text: string) {
  return enabled && text.trim() !== "";
}
