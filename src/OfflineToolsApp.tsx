import { useEffect, useState } from "react";
import { FrameExtractor } from "@/App";
import { ToolHome } from "@/ToolHome";
import {
  readToolRoute,
  type ToolRoute,
} from "@/lib/tool-navigation";
import { useRouteSeo } from "@/lib/seo";
import { ImageProcessor } from "@/tools/image-processor/ImageProcessor";

export function OfflineToolsApp() {
  const [route, setRoute] = useState<ToolRoute>(readToolRoute);
  useRouteSeo(route);

  useEffect(() => {
    const onPopState = () => setRoute(readToolRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (route === "image-compress" || route === "image-watermark") {
    return (
      <ImageProcessor
        initialMode={route === "image-watermark" ? "watermark" : "compress"}
      />
    );
  }
  if (route === "video-frame") return <FrameExtractor />;
  return <ToolHome />;
}
