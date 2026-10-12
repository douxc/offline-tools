import { CENTERED_CROP, type CropPosition } from "./id-photo-geometry";
import { LocalizedError } from "./i18n/localized-error";

export type PhotoAsset = {
  id: string; file: File; url: string; image: HTMLImageElement;
  width: number; height: number; sequence: number; revision: number; crop: CropPosition;
};
export const MAX_PHOTO_PIXELS = 60_000_000;
export const acceptsPhoto = (file: Pick<File, "name" | "type">) =>
  ["image/png", "image/jpeg", "image/webp"].includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);

export async function loadPhoto(file: File): Promise<Omit<PhotoAsset, "sequence">> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new LocalizedError("err.idPhoto.decodeFailed"));
      image.src = url;
    });
    const width = image.naturalWidth, height = image.naturalHeight;
    if (width < 1 || height < 1) throw new LocalizedError("err.idPhoto.invalidDimensions");
    if (width * height > MAX_PHOTO_PIXELS) throw new LocalizedError("err.idPhoto.tooManyPixels");
    return { id: crypto.randomUUID(), file, url, image, width, height, revision: 0, crop: { ...CENTERED_CROP } };
  } catch (error) {
    URL.revokeObjectURL(url);
    image.src = "";
    throw error;
  }
}

export function releasePhoto(asset: Pick<PhotoAsset, "url" | "image">) {
  URL.revokeObjectURL(asset.url);
  asset.image.src = "";
}

export async function importPhotos(
  files: readonly File[],
  isCurrent: () => boolean,
  loader: typeof loadPhoto = loadPhoto,
  release: typeof releasePhoto = releasePhoto,
) {
  const loaded: Omit<PhotoAsset, "sequence">[] = [];
  const failures: string[] = [];
  for (const file of files) {
    if (!isCurrent()) break;
    if (!acceptsPhoto(file)) { failures.push(`${file.name}: err.idPhoto.notAcceptedFormat`); continue; }
    try {
      const asset = await loader(file);
      loaded.push(asset);
    } catch (error) { failures.push(`${file.name}：${error instanceof Error ? error.message : String(error)}`); }
  }
  if (!isCurrent()) {
    loaded.forEach(release);
    return { loaded: [], failures: [], cancelled: true };
  }
  return { loaded, failures, cancelled: false };
}
