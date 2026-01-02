import { motion, AnimatePresence } from "motion/react";
import Color from "color";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Slider } from "@/components/ui/slider";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
  ColorPickerOutput,
} from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useBackgroundStore,
  GRADIENT_PRESETS,
} from "@/stores/background-store";
import { cn } from "@/lib/utils";

export function BackgroundSidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    backgroundType,
    gradientPreset,
    padding,
    borderRadius,
    shadowSize,
    shadowColor,
    setBackgroundType,
    setGradientPreset,
    setCustomImage,
    setPadding,
    setBorderRadius,
    setShadowSize,
    setShadowColor,
  } = useBackgroundStore();

  const handleUploadImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
    });

    if (selected) {
      const bytes = await readFile(selected);
      const blob = new Blob([bytes]);
      const url = URL.createObjectURL(blob);
      setCustomImage(url);
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

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute left-0 top-0 z-20 h-full w-80 border-r bg-background shadow-xl"
        >
          <div className="flex h-full flex-col">
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

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
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
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleUploadImage}
                  >
                    <Icon name="image-plus" className="h-4 w-4" />
                    Upload Image
                  </Button>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Padding</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{padding}px</span>
                  </div>
                  <Slider
                    value={[padding]}
                    onValueChange={(v) => setPadding(Array.isArray(v) ? v[0] : v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Rounding</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {borderRadius}px
                    </span>
                  </div>
                  <Slider
                    value={[borderRadius]}
                    onValueChange={(v) => setBorderRadius(Array.isArray(v) ? v[0] : v)}
                    min={0}
                    max={48}
                    step={1}
                  />
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Shadow Size</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {shadowSize}px
                    </span>
                  </div>
                  <Slider
                    value={[shadowSize]}
                    onValueChange={(v) => setShadowSize(Array.isArray(v) ? v[0] : v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-medium text-muted-foreground">Shadow Color</span>
                  <Popover>
                    <PopoverTrigger
                      render={(props) => (
                        <button
                          {...props}
                          type="button"
                          className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
