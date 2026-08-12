export interface ScaledDimensions {
  width: number;
  height: number;
}

/**
 * Compute the output canvas dimensions for a compressed export. When
 * `targetWidth` is given and smaller than the original, the video is scaled
 * down keeping the aspect ratio (height floored to an integer). No upscaling:
 * a target at least as large as the source returns the original dimensions.
 */
export function computeScaledDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
): ScaledDimensions {
  if (!targetWidth || targetWidth <= 0 || targetWidth >= originalWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  const ratio = targetWidth / originalWidth;
  return {
    width: targetWidth,
    height: Math.floor(originalHeight * ratio),
  };
}
