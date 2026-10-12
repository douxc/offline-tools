import { LocalizedError } from "./i18n/localized-error";
export type Dimensions = { width: number; height: number };
export type CropPosition = { cx: number; cy: number; zoom: number };
export type SourceRect = Dimensions & { x: number; y: number };
export const CENTERED_CROP: CropPosition = { cx: 0.5, cy: 0.5, zoom: 1 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function cropGeometry(source: Dimensions, target: Dimensions, position: CropPosition) {
  const zoom = clamp(Number.isFinite(position.zoom) ? position.zoom : 1, 1, 4);
  const scale = Math.max(target.width / source.width, target.height / source.height) * zoom;
  const width = Math.min(source.width, target.width / scale);
  const height = Math.min(source.height, target.height / scale);
  const cx = clamp(position.cx, width / (2 * source.width), 1 - width / (2 * source.width));
  const cy = clamp(position.cy, height / (2 * source.height), 1 - height / (2 * source.height));
  return {
    position: { cx, cy, zoom },
    scale,
    rect: { x: source.width * cx - width / 2, y: source.height * cy - height / 2, width, height },
  };
}

/** Screen movement changes the image position; source crop center moves oppositely. */
export function moveCrop(source: Dimensions, target: Dimensions, position: CropPosition, dx: number, dy: number, frameWidth = target.width): CropPosition {
  const { scale } = cropGeometry(source, target, position);
  const displayScale = frameWidth / target.width;
  if (!(displayScale > 0)) return position;
  return cropGeometry(source, target, {
    ...position,
    cx: position.cx - dx / (displayScale * scale * source.width),
    cy: position.cy - dy / (displayScale * scale * source.height),
  }).position;
}

export function resizeDimensions(source: Dimensions, axis: "width" | "height", text: string): Dimensions {
  if (!/^\d+$/.test(text.trim())) throw new LocalizedError("err.idPhoto.invalidPixels");
  const target = Number(text);
  if (!Number.isSafeInteger(target) || target < 1) throw new LocalizedError("err.idPhoto.invalidPixels");
  if (target > source[axis]) throw new LocalizedError("err.idPhoto.cannotUpscale");
  const scale = target / source[axis];
  return {
    width: axis === "width" ? target : Math.max(1, Math.round(source.width * scale)),
    height: axis === "height" ? target : Math.max(1, Math.round(source.height * scale)),
  };
}

export function validTarget(text: string) {
  return /^\d+$/.test(text.trim()) && Number.isSafeInteger(Number(text)) && Number(text) > 0;
}
