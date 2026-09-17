import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        data-slot="popconfirm-content"
        className={cn(
          "z-50 w-[264px] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export type PopconfirmProps = {
  /** 触发元素（通常是一个 Button），将被包裹为 Popover Trigger。 */
  trigger: React.ReactElement;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 确认按钮配色：破坏性操作默认 danger。 */
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onOpenChange?: (open: boolean) => void;
};

/**
 * 轻量二次确认：锚定触发按钮的非模态弹出层（Popover），
 * 不打断页面上下文；Escape/点击空白关闭，关闭后焦点回到触发按钮。
 */
export function Popconfirm({
  trigger,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  confirmVariant = "destructive",
  onConfirm,
  onOpenChange,
}: PopconfirmProps) {
  const [open, setOpen] = React.useState(false);
  /**
   * 初始焦点落在取消键。
   *
   * Apple HIG 规定不得为破坏性动作分配 primary 角色,但未规定破坏性确认框的
   * 默认焦点;此处按项目裁决(2026-09-17)取取消键 —— 避免用户按 Return 直接
   * 触发不可逆的清空/重置。破坏性动作必须显式点击或 Tab 过去才能触发。
   */
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);
  const handleConfirm = () => {
    onConfirm();
    close();
  };

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-3.5 flex justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            size="sm"
            onClick={close}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </PopoverPrimitive.Root>
  );
}
