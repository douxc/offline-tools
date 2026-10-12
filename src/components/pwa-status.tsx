import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useT } from "@/lib/i18n/locale-context";

export function PwaStatus() {
  const t = useT();
  const offlineToastShown = useRef(false);
  const updateToastShown = useRef(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("PWA registration failed", error);
    },
  });

  useEffect(() => {
    if (!offlineReady || offlineToastShown.current) return;
    offlineToastShown.current = true;
    toast.success(t("pwa.offlineReady"), {
      description: t("pwa.offlineReadyBody"),
      duration: 4200,
      onDismiss: () => setOfflineReady(false),
    });
  }, [offlineReady, setOfflineReady, t]);

  useEffect(() => {
    if (!needRefresh || updateToastShown.current) return;
    updateToastShown.current = true;
    toast.info(t("pwa.updateReady"), {
      description: t("pwa.updateReadyBody"),
      duration: 8000,
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, t]);

  return null;
}
