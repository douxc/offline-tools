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
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-[#3b3b37]">
        <SliderPrimitive.Range className="absolute h-full bg-[#d6ff3f]" />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block size-3.5 shrink-0 rounded-full border-2 border-[#111110] bg-[#d6ff3f] shadow-[0_0_0_1px_#d6ff3f] outline-none focus-visible:ring-2 focus-visible:ring-[#d6ff3f]/60"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
