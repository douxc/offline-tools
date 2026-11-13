import { createFrameZipArchive } from "./zip-packer";

export type ImageDownload = { blob: Blob; fileName: string };
export type DownloadPort = {
  createUrl: (blob: Blob) => string;
  releaseUrl: (url: string) => void;
  save: (url: string, name: string) => void;
  later: (release: () => void) => void;
};

const browserDownload: DownloadPort = {
  createUrl: blob => URL.createObjectURL(blob),
  releaseUrl: url => URL.revokeObjectURL(url),
  save: (url, name) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
  },
  later: release => { window.setTimeout(release, 2000); },
};

export async function downloadImages(
  outputs: readonly ImageDownload[],
  archiveName: string,
  port: DownloadPort = browserDownload,
) {
  let downloads = outputs;
  if (outputs.length > 3) {
    // Reserve original names so suffixes never replace another source file.
    const reserved = new Set(outputs.map(output => output.fileName));
    const used = new Set<string>();
    async function* entries() {
      for (const output of outputs) {
        let name = output.fileName;
        const extensionAt = name.lastIndexOf(".");
        const base = extensionAt > 0 ? name.slice(0, extensionAt) : name;
        const extension = extensionAt > 0 ? name.slice(extensionAt) : "";
        let suffix = 2;
        if (used.has(name)) {
          do { name = `${base}_${suffix++}${extension}`; }
          while (used.has(name) || reserved.has(name));
        }
        used.add(name);
        yield { name, data: new Uint8Array(await output.blob.arrayBuffer()) };
      }
    }
    downloads = [{ blob: await createFrameZipArchive(entries()), fileName: archiveName }];
  }
  for (const output of downloads) {
    const url = port.createUrl(output.blob);
    try { port.save(url, output.fileName); }
    finally { port.later(() => port.releaseUrl(url)); }
  }
}
