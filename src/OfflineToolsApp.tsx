import { useEffect, useState } from "react";
import { FrameExtractor } from "@/App";
import { ToolHome } from "@/ToolHome";
import { VideoCompressor } from "@/components/video-compressor";
import {
  readToolRoute,
  type ToolRoute,
} from "@/lib/tool-navigation";
import { useRouteSeo } from "@/lib/seo";
import { ImageProcessor } from "@/tools/image-processor/ImageProcessor";
import { A4ImageLayout } from "@/tools/image-a4-layout/A4ImageLayout";

export function OfflineToolsApp() {
  const [route, setRoute] = useState<ToolRoute>(readToolRoute);
  useRouteSeo(route);

  useEffect(() => {
    const onPopState = () => setRoute(readToolRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (
    route === "image-compress" ||
    route === "image-watermark" ||
    route === "image-a4-layout"
  ) {
    // 图片工具保持常挂载并按路由切换可见性，互切时不丢已导入图片，
    // 与压缩↔水印之间的既有行为一致（见 design.md 决策 4）。
    const showCompress =
      route === "image-compress" || route === "image-watermark";
    return (
      <>
        <div hidden={!showCompress}>
          <ImageProcessor
            initialMode={
              route === "image-watermark" ? "watermark" : "compress"
            }
            route={route}
          />
        </div>
        <div hidden={route !== "image-a4-layout"}>
          <A4ImageLayout />
        </div>
      </>
    );
  }
  if (route === "video-frame") return <FrameExtractor />;
  if (route === "video-compress") return <VideoCompressor />;
  return <ToolHome />;
}
