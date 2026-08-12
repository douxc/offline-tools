export type SamplingMode = "interval" | "step" | "evenly";

/** Round to 6 decimals to suppress binary floating-point noise (e.g. 0.6000000000000001 -> 0.6). */
const roundTime = (t: number) => Number(t.toFixed(6));

/**
 * Time points (seconds) stepping from 0 by `intervalSeconds`, each strictly
 * less than `duration`. When the interval is at least the duration only the
 * first frame at 0 is returned.
 */
export function sampleFramesByInterval(
  duration: number,
  intervalSeconds: number,
): number[] {
  if (duration <= 0 || intervalSeconds <= 0) return [0];
  const points: number[] = [];
  for (let i = 0; ; i += 1) {
    const t = roundTime(i * intervalSeconds);
    if (t >= duration) break;
    points.push(t);
  }
  return points.length === 0 ? [0] : points;
}

/**
 * Time points (seconds) stepping from 0 by `frameStep / fps`, each strictly
 * less than `duration`. Index multiplication avoids floating-point drift from
 * repeated addition.
 */
export function sampleFramesByStep(
  duration: number,
  fps: number,
  frameStep: number,
): number[] {
  if (duration <= 0 || fps <= 0 || frameStep < 1) return [0];
  const step = frameStep / fps;
  const points: number[] = [];
  for (let i = 0; ; i += 1) {
    const t = roundTime(i * step);
    if (t >= duration) break;
    points.push(t);
  }
  return points.length === 0 ? [0] : points;
}

/**
 * `count` evenly distributed time points (seconds) in [0, duration): point i is
 * `duration * i / count`. Always includes the first frame at 0.
 */
export function sampleFramesEvenly(duration: number, count: number): number[] {
  if (duration <= 0 || count < 1) return [0];
  const points: number[] = [];
  for (let i = 0; i < count; i += 1) {
    points.push(roundTime((duration * i) / count));
  }
  return points;
}
