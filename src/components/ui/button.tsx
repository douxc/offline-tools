import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,transform,opacity] outline-none focus-visible:ring-2 focus-visible:ring-[#d6ff3f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111110] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#d6ff3f] text-[#171a0b] hover:brightness-105 active:translate-y-px",
        outline:
          "border border-[#3b3b38] bg-transparent text-[#f4f4ef] hover:border-[#696963] hover:bg-[#1c1c1a]",
        secondary:
          "border border-[#393936] bg-[#21211f] text-[#d9d9d1] hover:border-[#61615c]",
        ghost: "bg-transparent text-[#a9a9a1] hover:bg-[#242421] hover:text-white",
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
