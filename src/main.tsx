import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { PwaStatus } from "@/components/pwa-status";
import { FrameExtractor } from "@/App";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FrameExtractor />
    <PwaStatus />
    <Toaster />
  </StrictMode>,
);
