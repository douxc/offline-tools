import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,transform,opacity] outline-none focus-visible:ring-2 focus-visible:ring-[var(--acid)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--acid)] text-[var(--acid-ink)] hover:brightness-105 active:translate-y-px",
        outline:
          "border border-[var(--control-border)] bg-transparent text-[var(--ink)] hover:border-[var(--control-border-hover)] hover:bg-[var(--surface-hover)]",
        secondary:
          "border border-[var(--control-border)] bg-[var(--control-bg)] text-[var(--control-text)] hover:border-[var(--control-border-hover)]",
        ghost:
          "bg-transparent text-[var(--soft-text)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-[52px] rounded-[9px] px-6",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
