import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1 before:content-[''] before:block before:left-0 before:w-full before:absolute before:pointer-events-none before:rounded-md before:transition-[height] before:duration-100 before:ease-out before:[--scroll-area-overflow-y-start:inherit] before:top-0 before:h-[min(80px,var(--scroll-area-overflow-y-start))] before:bg-gradient-to-b before:from-background before:to-transparent after:content-[''] after:block after:left-0 after:w-full after:absolute after:pointer-events-none after:rounded-md after:transition-[height] after:duration-100 after:ease-out after:[--scroll-area-overflow-y-end:inherit] after:bottom-0 after:h-[min(80px,var(--scroll-area-overflow-y-end,80px))] after:bg-gradient-to-t after:from-background after:to-transparent"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "absolute z-20 flex touch-none p-px transition-colors select-none data-horizontal:bottom-0 data-horizontal:left-0 data-horizontal:h-2.5 data-horizontal:w-full data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:right-0 data-vertical:top-0 data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="rounded-full bg-foreground/30 hover:bg-foreground/50 transition-colors relative flex-1 w-full"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
