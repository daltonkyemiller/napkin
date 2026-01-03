import { useState, useEffect, useRef } from "react";
import Color from "color";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerOutput,
} from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBackgroundStore, GRADIENT_PRESETS, ASPECT_RATIOS } from "@/stores/background-store";
import { cn } from "@/lib/utils";

export function BackgroundSidebar() {
  const {
    setSidebarOpen,
    backgroundType,
    gradientPreset,
    customImage,
    padding,
    borderRadius,
    shadowSize,
    shadowColor,
    aspectRatio,
    blur,
    imageHasTransparency,
    setBackgroundType,
    setGradientPreset,
    setCustomImage,
    setPadding,
    setBorderRadius,
    setShadowSize,
    setShadowColor,
    setAspectRatio,
    setBlur,
  } = useBackgroundStore();

  const handleUploadImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
    });

    if (selected) {
      const bytes = await readFile(selected);
      const blob = new Blob([bytes]);
      const originalUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1920;
        const { width, height } = img;

        if (width <= MAX_SIZE && height <= MAX_SIZE) {
          setCustomImage(originalUrl);
          return;
        }

        const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          canvas.toBlob(
            (resizedBlob) => {
              if (resizedBlob) {
                URL.revokeObjectURL(originalUrl);
                setCustomImage(URL.createObjectURL(resizedBlob));
              }
            },
            "image/jpeg",
            0.9,
          );
        }
      };
      img.src = originalUrl;
    }
  };

  const handleShadowColorChange = (rgba: [number, number, number, number]) => {
    const [r, g, b, a] = rgba;
    const color = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
    setShadowColor(color);
  };

  const parseShadowColor = () => {
    try {
      return Color(shadowColor).hex();
    } catch {
      return "#000000";
    }
  };

  const hasImageBackground = backgroundType === "image" && customImage;
  const isNoneSelected = backgroundType === "none";

  const [localBlur, setLocalBlur] = useState(blur);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalBlur(blur);
  }, [blur]);

  const handleBlurChange = (value: number) => {
    setLocalBlur(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setBlur(value), 150);
  };

  return (
    <div className="flex h-full w-80 flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-sm font-semibold">Background</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setSidebarOpen(false)}
        >
          <Icon name="xmark" className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4">
          <div className="space-y-3">
            <span className="text-xs font-medium text-muted-foreground">Presets</span>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (preset.id === "none") {
                      setBackgroundType("none");
                    } else {
                      setGradientPreset(preset.id);
                    }
                  }}
                  className={cn(
                    "h-12 w-full rounded-md border-2 transition-all hover:scale-105",
                    (backgroundType === "gradient" && gradientPreset === preset.id) ||
                      (backgroundType === "none" && preset.id === "none")
                      ? "border-ring ring-2 ring-ring/50"
                      : "border-border",
                  )}
                  style={{
                    background: preset.value,
                  }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-medium text-muted-foreground">Custom Image</span>
            <Button
              variant={hasImageBackground ? "secondary" : "outline"}
              className="w-full justify-start gap-2"
              onClick={handleUploadImage}
            >
              <Icon name="image-plus" className="h-4 w-4" />
              {hasImageBackground ? "Change Image" : "Upload Image"}
            </Button>
          </div>

          {hasImageBackground && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Blur</span>
                <span className="text-xs tabular-nums text-muted-foreground">{localBlur}px</span>
              </div>
              <Slider
                value={[localBlur]}
                onValueChange={(v) => handleBlurChange(Array.isArray(v) ? v[0] : v)}
                min={0}
                max={150}
                step={1}
              />
            </div>
          )}

          <div className={cn("space-y-6", isNoneSelected && "opacity-50 pointer-events-none")}>
            <div className="h-px bg-border" />

            <div className="space-y-3">
              <span className="text-xs font-medium text-muted-foreground">Ratio</span>
              <Select
                value={aspectRatio}
                onValueChange={(v) => setAspectRatio(v as typeof aspectRatio)}
                disabled={isNoneSelected}
              >
                <SelectTrigger className="w-full">
                  {ASPECT_RATIOS.find((r) => r.id === aspectRatio)?.label || "Auto"}
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.id} value={ratio.id}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Padding</span>
                <span className="text-xs tabular-nums text-muted-foreground">{padding}px</span>
              </div>
              <Slider
                value={[padding]}
                onValueChange={(v) => setPadding(Array.isArray(v) ? v[0] : v)}
                min={0}
                max={300}
                step={1}
                disabled={isNoneSelected}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Rounding</span>
                <span className="text-xs tabular-nums text-muted-foreground">{borderRadius}px</span>
              </div>
              <Slider
                value={[borderRadius]}
                onValueChange={(v) => setBorderRadius(Array.isArray(v) ? v[0] : v)}
                min={0}
                max={96}
                step={1}
                disabled={isNoneSelected}
              />
            </div>

            <div className="h-px bg-border" />

            <div
              className={cn("space-y-3", imageHasTransparency && "opacity-50 pointer-events-none")}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Shadow {imageHasTransparency && "(transparent image)"}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{shadowSize}px</span>
              </div>
              <Slider
                value={[shadowSize]}
                onValueChange={(v) => setShadowSize(Array.isArray(v) ? v[0] : v)}
                min={0}
                max={150}
                step={1}
                disabled={isNoneSelected || imageHasTransparency}
              />
            </div>

            <div
              className={cn("space-y-3", imageHasTransparency && "opacity-50 pointer-events-none")}
            >
              <span className="text-xs font-medium text-muted-foreground">Shadow Color</span>
              <Popover>
                <PopoverTrigger
                  render={(props) => (
                    <button
                      {...props}
                      type="button"
                      disabled={isNoneSelected || imageHasTransparency}
                      className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:pointer-events-none"
                    >
                      <div
                        className="h-5 w-5 rounded border"
                        style={{ backgroundColor: shadowColor }}
                      />
                      <span className="text-muted-foreground">{parseShadowColor()}</span>
                    </button>
                  )}
                />
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    value={shadowColor}
                    onChange={(rgba) =>
                      handleShadowColorChange(rgba as [number, number, number, number])
                    }
                  >
                    <ColorPickerSelection className="h-32 rounded-md" />
                    <ColorPickerHue />
                    <ColorPickerAlpha />
                    <ColorPickerOutput />
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
