import Color from "color";
import { useEffect, useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerOutput,
  ColorPickerFormat,
} from "@/components/ui/color-picker";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { STROKE_COLORS } from "@/constants";

const COLOR_KEYS = ["a", "s", "d", "f", "g", "h", "j", "l", ";", "'"];
const CUSTOM_KEY = "c";
const CUSTOMIZE_KEY = "e";

interface ColorPaletteDropdownProps {
  value: string;
  onChange: (color: string) => void;
}

type View = "palette" | "custom" | "customize";

export function ColorPaletteDropdown({ value, onChange }: ColorPaletteDropdownProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("palette");
  const [isAddingToPalette, setIsAddingToPalette] = useState(false);
  const { palette, setPalette } = useSettingsStore();

  const handleColorSelect = useCallback(
    (color: string) => {
      onChange(color);
      setOpen(false);
    },
    [onChange],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (!open) return;

      if (e.key === "Backspace" && view !== "palette") {
        e.preventDefault();
        e.stopPropagation();
        setView("palette");
        return;
      }

      if (view !== "palette") return;

      const colorIndex = COLOR_KEYS.indexOf(e.key);
      if (colorIndex !== -1 && colorIndex < palette.length) {
        e.preventDefault();
        e.stopPropagation();
        handleColorSelect(palette[colorIndex]);
        return;
      }

      if (e.key === CUSTOM_KEY) {
        e.preventDefault();
        e.stopPropagation();
        setIsAddingToPalette(false);
        setView("custom");
        return;
      }

      if (e.key === CUSTOMIZE_KEY) {
        e.preventDefault();
        e.stopPropagation();
        setView("customize");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, view, palette, handleColorSelect]);

  const handleCustomColorChange = (rgba: [number, number, number, number]) => {
    const [r, g, b, a] = rgba;
    const color =
      a < 1
        ? `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
        : Color.rgb(r, g, b).hex();
    onChange(color);
  };

  const handleAddColor = (color: string) => {
    if (!palette.includes(color)) {
      setPalette([...palette, color]);
    }
  };

  const handleRemoveColor = (color: string) => {
    setPalette(palette.filter((c) => c !== color));
  };

  const handleResetPalette = () => {
    setPalette([...STROKE_COLORS]);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(open) => {
        if (!open) setView("palette");
      }}
    >
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger
          render={(props) => (
            <PopoverTrigger
              {...props}
              className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: value }}
            />
          )}
        />
        <TooltipContent side="bottom">
          Color Palette <Kbd>K</Kbd>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 p-0" align="start">
        {view === "palette" && (
          <div className="flex flex-col">
            <div className="grid grid-cols-5 gap-2 p-3">
              {palette.map((color, index) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "relative h-8 w-8 rounded-md border-2 transition-transform hover:scale-110",
                    value === color ? "border-ring ring-2 ring-ring/50" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                >
                  {index < COLOR_KEYS.length && (
                    <Kbd className="absolute -bottom-1 -right-1 h-4 min-w-4 px-0.5 text-[10px] shadow-sm">
                      {COLOR_KEYS[index].toUpperCase()}
                    </Kbd>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t p-2 flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => setView("custom")}
              >
                <span className="flex items-center gap-2">
                  <Icon name="palette" className="h-4 w-4" />
                  Custom color
                </span>
                <Kbd>{CUSTOM_KEY.toUpperCase()}</Kbd>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => setView("customize")}
              >
                <span className="flex items-center gap-2">
                  <Icon name="gear" className="h-4 w-4" />
                  Customize palette
                </span>
                <Kbd>{CUSTOMIZE_KEY.toUpperCase()}</Kbd>
              </Button>
            </div>
          </div>
        )}

        {view === "custom" && (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setView("palette")}
              >
                <Icon name="arrow-left" className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">Custom color</span>
            </div>
            <ColorPicker
              value={value}
              onChange={(rgba) => handleCustomColorChange(rgba as [number, number, number, number])}
            >
              <ColorPickerSelection className="h-32 rounded-md" />
              <ColorPickerHue />
              <ColorPickerAlpha />
              <div className="flex items-center gap-2">
                <ColorPickerOutput />
                <ColorPickerFormat className="flex-1" />
              </div>
            </ColorPicker>
            {isAddingToPalette ? (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => {
                  handleAddColor(value);
                  setIsAddingToPalette(false);
                  setView("palette");
                }}
              >
                Add to palette
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAddColor(value)}
                >
                  Add to palette
                </Button>
                <Button variant="default" size="sm" className="flex-1" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            )}
          </div>
        )}

        {view === "customize" && (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setView("palette")}
                >
                  <Icon name="arrow-left" className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">Customize palette</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={handleResetPalette}
              >
                Reset
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleRemoveColor(color)}
                  className="group relative h-10 w-full rounded-md border border-border transition-all hover:scale-105 hover:border-destructive"
                  style={{ backgroundColor: color }}
                  title={`Remove ${color}`}
                >
                  <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon name="xmark" className="h-4 w-4 text-white" />
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsAddingToPalette(true);
                  setView("custom");
                }}
                className="flex h-10 w-full items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
                title="Add color"
              >
                <span className="text-lg font-light">+</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click a color to remove it
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
