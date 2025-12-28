import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      className="w-full"
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      {...props}
    >
      <SliderPrimitive.Control
        className={cn(
          "relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
          className,
        )}
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-muted relative h-2 w-full overflow-hidden rounded-full select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary absolute h-full select-none"
          />
        </SliderPrimitive.Track>
        {_values.map((val) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={`thumb-${val}`}
            className="border-primary ring-ring/50 block size-4 shrink-0 cursor-pointer select-none rounded-full border-2 bg-white shadow-sm transition-shadow hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
