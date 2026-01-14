import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/stores/settings-store";
import { type StrokeSizePreset } from "@/stores/canvas-store";
import { useThemeStore, type ThemeMode } from "@/stores/theme-store";
import { IconCustomizerDialog } from "./icon-customizer-dialog";
import { ThemeCustomizerDialog } from "./theme-customizer-dialog";
import { BooleanToggleSetting } from "./boolean-toggle-setting";
import { open } from "@tauri-apps/plugin-dialog";
import { Icon } from "@/components/ui/icon";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const STROKE_SIZE_OPTIONS: { value: StrokeSizePreset; label: string }[] = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
];

export function SettingsDialog({ open: isOpen, onOpenChange }: SettingsDialogProps) {
  const {
    strokeSizePreset,
    setStrokeSizePreset,
    fontSize,
    setFontSize,
    sketchiness,
    setSketchiness,
    defaultSaveLocation,
    setDefaultSaveLocation,
    autoSaveToDefault,
    setAutoSaveToDefault,
    closeAfterSave,
    setCloseAfterSave,
    defaultSaveFormat,
    setDefaultSaveFormat,
    copyToClipboardOnSave,
    setCopyToClipboardOnSave,
    closeAfterCopy,
    setCloseAfterCopy,
    selectModeAfterDrawing,
    setSelectModeAfterDrawing,
    openFolderAfterSave,
    setOpenFolderAfterSave,
  } = useSettingsStore();
  const { mode, setMode } = useThemeStore();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [iconCustomizerOpen, setIconCustomizerOpen] = useState(false);

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Default Save Location",
    });
    if (selected && typeof selected === "string") {
      setDefaultSaveLocation(selected);
    }
  };

  const handleClearSaveLocation = () => {
    setDefaultSaveLocation(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your annotation preferences</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Default Stroke Size</span>
              <div className="flex items-center gap-2">
                {STROKE_SIZE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={strokeSizePreset === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStrokeSizePreset(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Default Font Size</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFontSize(Math.max(8, fontSize - 4))}
                >
                  -
                </Button>
                <span className="w-8 text-center text-sm">{fontSize}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFontSize(Math.min(96, fontSize + 4))}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Default Sketchiness</span>
                <span className="text-xs text-muted-foreground">Roughness of drawn shapes</span>
              </div>
              <div className="flex items-center gap-3 w-40">
                <Slider
                  value={[sketchiness]}
                  onValueChange={(values) => {
                    const val = Array.isArray(values) ? values[0] : values;
                    setSketchiness(val);
                  }}
                  min={0}
                  max={3}
                  step={0.1}
                />
                <span className="w-8 text-center text-sm tabular-nums">
                  {sketchiness.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium">Default Save Location</span>
                {defaultSaveLocation ? (
                  <span
                    className="text-xs text-muted-foreground truncate"
                    title={defaultSaveLocation}
                  >
                    {defaultSaveLocation}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Ask every time</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {defaultSaveLocation && (
                  <Button variant="ghost" size="sm" onClick={handleClearSaveLocation}>
                    Clear
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleSelectFolder}>
                  <Icon name="folder" size={16} />
                  Browse
                </Button>
              </div>
            </div>

            {defaultSaveLocation && (
              <BooleanToggleSetting
                label="Auto-save to default location"
                description="Skip the save dialog"
                value={autoSaveToDefault}
                onChange={setAutoSaveToDefault}
              />
            )}

            <BooleanToggleSetting
              label="Close after saving"
              description="Exit the app after save"
              value={closeAfterSave}
              onChange={setCloseAfterSave}
            />

            <BooleanToggleSetting
              label="Copy to clipboard on save"
              description="Also copy image when saving"
              value={copyToClipboardOnSave}
              onChange={setCopyToClipboardOnSave}
            />

            <BooleanToggleSetting
              label="Close after copy"
              description={`Exit app after ${isMac ? "⌘" : "Ctrl"}+C`}
              value={closeAfterCopy}
              onChange={setCloseAfterCopy}
            />

            <BooleanToggleSetting
              label="Open folder after saving"
              description="Reveal saved file in folder"
              value={openFolderAfterSave}
              onChange={setOpenFolderAfterSave}
            />

            <BooleanToggleSetting
              label="Select mode after drawing"
              description="Switch to select tool after drawing"
              value={selectModeAfterDrawing}
              onChange={setSelectModeAfterDrawing}
            />

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Default Save Format</span>
                <span className="text-xs text-muted-foreground">
                  Used when pressing {isMac ? "⌘" : "Ctrl"}+S
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={defaultSaveFormat === "png" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDefaultSaveFormat("png")}
                >
                  PNG
                </Button>
                <Button
                  variant={defaultSaveFormat === "jpg" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDefaultSaveFormat("jpg")}
                >
                  JPG
                </Button>
              </div>
            </div>

            <div className="border-t pt-4 flex items-center justify-between">
              <span className="text-sm font-medium">Theme</span>
              <div className="flex items-center gap-2">
                {themeModes.map((themeMode) => (
                  <Button
                    key={themeMode.value}
                    variant={mode === themeMode.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode(themeMode.value)}
                  >
                    {themeMode.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Custom Theme</span>
                <span className="text-xs text-muted-foreground">Paste a shadcn/ui theme CSS</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCustomizerOpen(true)}>
                Customize
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Custom Icons</span>
                <span className="text-xs text-muted-foreground">Map icons to custom SVG files</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIconCustomizerOpen(true)}>
                Customize
              </Button>
            </div>
          </div>
        </ScrollArea>

        <div className="text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Ctrl+,</kbd> to open
          settings
        </div>

        <ThemeCustomizerDialog open={customizerOpen} onOpenChange={setCustomizerOpen} />
        <IconCustomizerDialog open={iconCustomizerOpen} onOpenChange={setIconCustomizerOpen} />
      </DialogContent>
    </Dialog>
  );
}
