import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/lib/theme";

function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      offset={44}
      toastOptions={{
        classNames: {
          toast: "app-toast !shadow-2xl",
          description: "app-toast-description",
          actionButton: "app-toast-action",
          cancelButton: "app-toast-cancel",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
