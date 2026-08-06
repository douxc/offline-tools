import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const outputFile = "public/assets/image-compress-worker.js";
const legalBanner = [
  "offline-tools image compression worker",
  "GPL-3.0-or-later",
  "License and source instructions: /legal/CORRESPONDING_SOURCE.md",
  "Third-party notices: /legal/THIRD_PARTY_NOTICES.md",
  "NO WARRANTY",
].join(" | ");

const result = await build({
  entryPoints: ["src/workers/image-compress-worker.ts"],
  bundle: true,
  banner: {
    js: `/*! ${legalBanner} */`,
  },
  format: "iife",
  legalComments: "inline",
  loader: { ".wasm": "binary" },
  minify: true,
  platform: "browser",
  target: "es2022",
  write: false,
});

const output = result.outputFiles[0];
if (!output) throw new Error("图片压缩 Worker 未生成");

try {
  const existingOutput = await readFile(outputFile);
  if (Buffer.compare(existingOutput, output.contents) === 0) {
    console.log(`Unchanged ${outputFile} (${output.contents.byteLength} bytes)`);
    process.exit(0);
  }
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

await mkdir("public/assets", { recursive: true });
await writeFile(outputFile, output.contents);
console.log(`Generated ${outputFile} (${output.contents.byteLength} bytes)`);
