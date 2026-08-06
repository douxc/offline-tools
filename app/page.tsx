import type { Metadata } from "next";
import { FrameExtractor } from "./frame-extractor";

export const metadata: Metadata = {
  title: "帧切 · 离线视频取帧",
  description: "在浏览器中从本地视频精准选帧，并导出 PNG、JPEG 或 WebP 图片。",
};

export default function Home() {
  return <FrameExtractor />;
}
