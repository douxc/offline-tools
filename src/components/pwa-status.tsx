import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaStatus() {
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
    toast.success("已可离线使用", {
      description: "页面资源已保存在当前设备。",
      duration: 4200,
      onDismiss: () => setOfflineReady(false),
    });
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh || updateToastShown.current) return;
    updateToastShown.current = true;
    toast.info("新版本已缓存", {
      description: "不会打断当前工作，下次打开时自动生效。",
      duration: 8000,
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh]);

  return null;
}
