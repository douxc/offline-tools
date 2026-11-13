import type { Dimensions, SourceRect } from "./id-photo-geometry";
import { LocalizedError } from "./i18n/localized-error";
import { downloadImages, type DownloadPort } from "./image-download";
export type { DownloadPort } from "./image-download";

export type PhotoOutput = { blob: Blob; fileName: string; width: number; height: number };
export function photoMime(file: Pick<File, "type" | "name">) {
  if (file.type === "image/png" || /\.png$/i.test(file.name)) return "image/png";
  if (file.type === "image/webp" || /\.webp$/i.test(file.name)) return "image/webp";
  return "image/jpeg";
}
export function photoFileName(name: string, size: Dimensions, sequence: number, mime: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-") || "photo";
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  return `${base}_${size.width}x${size.height}_${String(sequence).padStart(3, "0")}.${extension}`;
}

export async function encodePhoto(
  image: CanvasImageSource,
  source: SourceRect,
  target: Dimensions,
  file: Pick<File, "type" | "name">,
  sequence: number,
  makeCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
): Promise<PhotoOutput> {
  const canvas = makeCanvas();
  try {
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) throw new LocalizedError("err.idPhoto.canvasFailed");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, target.width, target.height);
    const mime = photoMime(file);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(output => {
        if (!output) reject(new LocalizedError("err.idPhoto.encodeFailed"));
        else if (output.type !== mime) reject(new LocalizedError("err.idPhoto.unsupportedOutputFormat"));
        else resolve(output);
      }, mime, mime === "image/png" ? undefined : 0.92);
    });
    return { blob, fileName: photoFileName(file.name, target, sequence, mime), ...target };
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export function downloadPhotos(outputs: readonly PhotoOutput[], port?: DownloadPort) {
  return downloadImages(outputs, "id-photos.zip", port);
}
