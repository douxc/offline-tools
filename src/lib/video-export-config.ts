export type BitrateLevel = "low" | "medium" | "high";

/**
 * Target video bitrates (bits per second) for the MediaRecorder export. The
 * probe lets the user pick a quality level; the chosen value is passed as
 * `videoBitsPerSecond` so the output is genuinely compressed relative to the
 * source rather than re-recorded at a default rate.
 */
export const BITRATE_PRESETS: Record<BitrateLevel, number> = {
  low: 1_000_000,
  medium: 2_500_000,
  high: 6_000_000,
};

/** Resolve a quality level to its target bitrate in bits per second. */
export function chooseBitrate(level: BitrateLevel): number {
  return BITRATE_PRESETS[level];
}

/**
 * Candidate MediaRecorder MIME types in priority order. VP9 with Opus audio is
 * preferred (best compression, audio preserved); VP8+Opus is the fallback. The
 * plain container is the last resort so the browser picks codecs itself.
 */
const RECORDER_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

/**
 * Pick the best supported MediaRecorder MIME type. `isTypeSupported` is injected
 * so the logic is testable without a live MediaRecorder; `hasRecorder` gates
 * the whole path. Returns null when MediaRecorder is missing or no candidate
 * is supported (the caller must refuse to export in that case).
 */
export function pickRecorderMime(
  isTypeSupported: (mime: string) => boolean,
  hasRecorder: boolean,
): string | null {
  if (!hasRecorder) return null;
  for (const mime of RECORDER_MIME_CANDIDATES) {
    if (isTypeSupported(mime)) return mime;
  }
  return null;
}
