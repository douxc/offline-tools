import { LocalizedError, type LocalizedErrorCode } from "./i18n/localized-error";
export type PngCompressionStrategy =
  | "original"
  | "oxipng"
  | "libimagequant-oxipng";

export type PngCompressionResult = {
  id: number;
  success: true;
  png: ArrayBuffer;
  strategy: PngCompressionStrategy;
  planReason: string;
  originalSize: number;
  outputSize: number;
  width: number;
  height: number;
  quantizationAttempted: boolean;
  quantizedCandidateSize?: number;
  quantizationError?: string;
  paletteLength?: number;
  achievedQuality?: number;
};

type PngCompressionFailure = {
  id: number;
  success: false;
  error: string;
};

type PendingRequest = {
  resolve: (result: PngCompressionResult) => void;
  reject: (error: Error) => void;
  timer: number;
};

export class PngCompressor {
  private worker: Worker | null = null;
  private requestId = 0;
  private readonly requests = new Map<number, PendingRequest>();

  private getWorker(): Worker {
    if (this.worker) return this.worker;

    const workerUrl = new URL(
      `${import.meta.env.BASE_URL}assets/image-compress-worker.js`,
      window.location.href,
    );
    const worker = new Worker(workerUrl);
    worker.onmessage = (
      event: MessageEvent<PngCompressionResult | PngCompressionFailure>,
    ) => {
      const pending = this.requests.get(event.data.id);
      if (!pending) return;
      this.requests.delete(event.data.id);
      window.clearTimeout(pending.timer);
      if (event.data.success) pending.resolve(event.data);
      else pending.reject(new Error(event.data.error));
    };
    worker.onerror = () => {
      this.rejectAll("err.png.loadFailed");
      worker.terminate();
      this.worker = null;
    };
    this.worker = worker;
    return worker;
  }

  async compress(file: File, quality: number): Promise<PngCompressionResult> {
    const png = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const timer = window.setTimeout(() => {
        this.requests.delete(id);
        reject(new LocalizedError("err.png.timeout"));
      }, 120_000);
      this.requests.set(id, { resolve, reject, timer });
      this.getWorker().postMessage(
        { id, action: "compress-png", png, quality },
        [png],
      );
    });
  }

  dispose() {
    this.rejectAll("err.png.cancelled");
    this.worker?.terminate();
    this.worker = null;
  }

  /** 用**带码的**错误拒绝全部在途请求，使界面层能翻译成当前语言。 */
  private rejectAll(code: LocalizedErrorCode) {
    for (const pending of this.requests.values()) {
      window.clearTimeout(pending.timer);
      pending.reject(new LocalizedError(code));
    }
    this.requests.clear();
  }
}
