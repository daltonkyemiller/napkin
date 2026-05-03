import * as React from "react";

import { cn } from "@/lib/utils";

interface NumberScrubberProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  snapPoints?: readonly number[];
  disabled?: boolean;
  className?: string;
}

interface ScrubberStyle extends React.CSSProperties {
  "--scrubber-progress": string;
}

const DEFAULT_STEP = 1;
const SNAP_THRESHOLD_RATIO = 0.012;

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number, min: number) {
  const snapped = Math.round((value - min) / step) * step + min;
  const decimals = step.toString().split(".")[1]?.length ?? 0;
  return Number(snapped.toFixed(decimals));
}

function snapValue(
  value: number,
  min: number,
  max: number,
  step: number,
  snapPoints: readonly number[],
) {
  const steppedValue = roundToStep(clampValue(value, min, max), step, min);
  const threshold = Math.max(step, (max - min) * SNAP_THRESHOLD_RATIO);

  for (const snapPoint of snapPoints) {
    if (Math.abs(steppedValue - snapPoint) <= threshold) {
      return clampValue(snapPoint, min, max);
    }
  }

  return steppedValue;
}

function formatValue(value: number) {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function NumberScrubber({
  label,
  value,
  onValueChange,
  min,
  max,
  step = DEFAULT_STEP,
  unit,
  snapPoints = [],
  disabled = false,
  className,
}: NumberScrubberProps) {
  const labelId = React.useId();
  const [draftValue, setDraftValue] = React.useState(formatValue(value));
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    setDraftValue(formatValue(value));
  }, [isEditing, value]);

  const progress = ((clampValue(value, min, max) - min) / (max - min)) * 100;
  const style: ScrubberStyle = {
    "--scrubber-progress": `${progress}%`,
  };

  const commitDraftValue = React.useCallback(() => {
    const nextValue = Number.parseFloat(draftValue);

    if (!Number.isFinite(nextValue)) {
      setDraftValue(formatValue(value));
      return;
    }

    const clampedValue = clampValue(nextValue, min, max);
    onValueChange(clampedValue);
    setDraftValue(formatValue(clampedValue));
  }, [draftValue, max, min, onValueChange, value]);

  const updateFromPointer = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement> | PointerEvent, element: HTMLDivElement) => {
      const rect = element.getBoundingClientRect();
      const ratio = clampValue((event.clientX - rect.left) / rect.width, 0, 1);
      const rawValue = min + ratio * (max - min);
      const nextValue = snapValue(rawValue, min, max, step, snapPoints);
      onValueChange(nextValue);
    },
    [max, min, onValueChange, snapPoints, step],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    document.body.classList.add("dragging");
    updateFromPointer(event, element);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateFromPointer(moveEvent, element);
    };

    const handlePointerUp = () => {
      document.body.classList.remove("dragging");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      setDraftValue(formatValue(value));
      event.currentTarget.blur();
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "group relative flex h-9 cursor-ew-resize items-center rounded-md border border-input bg-muted/60 text-sm shadow-xs transition-[border-color,box-shadow,background-color]",
          "before:absolute before:inset-y-0 before:left-0 before:w-(--scrubber-progress) before:rounded-l-[calc(var(--radius-md)-1px)] before:bg-muted-foreground/15",
          "hover:border-ring/70 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
        )}
        style={style}
        onPointerDown={handlePointerDown}
      >
        <span
          id={labelId}
          className="relative flex-1 truncate px-3 text-xs font-medium text-muted-foreground"
        >
          {label}
        </span>
        <div className="relative flex h-full items-center bg-background/45 px-2">
          <input
            aria-labelledby={labelId}
            className="h-full w-14 cursor-text bg-transparent text-right text-xs tabular-nums text-foreground outline-none"
            disabled={disabled}
            inputMode="decimal"
            value={draftValue}
            onBlur={() => {
              setIsEditing(false);
              commitDraftValue();
            }}
            onChange={(event) => setDraftValue(event.target.value)}
            onFocus={() => setIsEditing(true)}
            onKeyDown={handleInputKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
          />
          {unit && <span className="text-xs tabular-nums text-muted-foreground">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export { NumberScrubber };
