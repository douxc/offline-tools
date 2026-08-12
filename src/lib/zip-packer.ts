import JSZip from "jszip";

/**
 * Maximum number of frames decoded in parallel during a batch export. The first
 * iteration decodes serially (concurrency 1) to keep memory near-constant: each
 * frame is encoded and handed to the ZIP stream before the next is decoded.
 */
export const BATCH_DECODE_CONCURRENCY = 1;

/** A single frame entry to pack into the archive. */
export interface FrameArchiveEntry {
  name: string;
  data: Uint8Array;
}

/**
 * Build a ZIP Blob from an iterable of frame entries. Streaming the entries in
 * (rather than buffering them all) keeps peak memory independent of frame count.
 */
export async function createFrameZipArchive(
  entries: Iterable<FrameArchiveEntry> | AsyncIterable<FrameArchiveEntry>,
): Promise<Blob> {
  const zip = new JSZip();
  for await (const entry of entries) {
    zip.file(entry.name, entry.data);
  }
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
  });
}

/**
 * Build a deterministic frame file name: `${baseName}_${index zero-padded to
 * 3}.${extension}`.
 */
export function frameFileName(
  baseName: string,
  index: number,
  extension: string,
): string {
  const padded = String(index).padStart(3, "0");
  return `${baseName}_${padded}.${extension}`;
}
