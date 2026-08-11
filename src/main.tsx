import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { PwaStatus } from "@/components/pwa-status";
import { OfflineToolsApp } from "@/OfflineToolsApp";
import { IcpFooter } from "@/components/icp-footer";
import {
  applyTheme,
  getInitialTheme,
  ThemeProvider,
} from "@/lib/theme";
import "@/index.css";

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider initialTheme={initialTheme}>
      <OfflineToolsApp />
      <PwaStatus />
      <Toaster />
      <IcpFooter />
    </ThemeProvider>
  </StrictMode>,
);
