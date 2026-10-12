import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { PwaStatus } from "@/components/pwa-status";
import { OfflineToolsApp } from "@/OfflineToolsApp";
import { IcpFooter } from "@/components/icp-footer";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { ThemeProvider } from "@/lib/theme";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <ThemeProvider>
        <OfflineToolsApp />
        <PwaStatus />
        <Toaster />
        <IcpFooter />
      </ThemeProvider>
    </LocaleProvider>
  </StrictMode>,
);
