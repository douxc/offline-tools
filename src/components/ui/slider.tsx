import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = props.value ?? props.defaultValue ?? [0];
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex min-h-11 w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[var(--slider-track)]">
        <SliderPrimitive.Range className="absolute h-full bg-[var(--acid)]" />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block size-5 shrink-0 rounded-full border-2 border-[var(--page)] bg-[var(--acid)] shadow-[0_0_0_1px_var(--acid)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--acid)]/60"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
