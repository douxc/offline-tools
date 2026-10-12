import type { PhotoOutput } from "./id-photo-export";
export type PhotoResult = PhotoOutput & { context: string; revision: number };

export function activePhotoResults(
  assets: readonly { id: string; revision: number }[],
  results: Record<string, PhotoResult>,
  context: string,
) {
  return Object.fromEntries(assets.flatMap(asset => {
    const result = results[asset.id];
    return result && result.context === context && result.revision === asset.revision ? [[asset.id, result]] : [];
  })) as Record<string, PhotoResult>;
}

/** Results are staged locally and are only returned as a complete batch. */
export class PhotoBatch {
  private generation = 0;
  cancel() { this.generation++; }
  current(id: number) { return this.generation === id; }
  async run<T, R>(
    items: readonly T[],
    process: (item: T) => Promise<R>,
    onProgress: (current: number, total: number) => void = () => {},
    yieldTask: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 0)),
  ) {
    const id = ++this.generation;
    const results: { item: T; result: R }[] = [];
    const failures: { item: T; error: string }[] = [];
    for (const [index, item] of items.entries()) {
      await yieldTask();
      if (!this.current(id)) return { id, cancelled: true, results: [], failures: [] };
      onProgress(index + 1, items.length);
      try {
        const result = await process(item);
        if (!this.current(id)) return { id, cancelled: true, results: [], failures: [] };
        results.push({ item, result });
      } catch (error) {
        if (!this.current(id)) return { id, cancelled: true, results: [], failures: [] };
        failures.push({ item, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { id, cancelled: false, results, failures };
  }
}
