import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/stores/settings-store";
import { useThemeStore, type ThemeMode } from "@/stores/theme-store";
import { ThemeCustomizerDialog } from "./theme-customizer-dialog";
import { open } from "@tauri-apps/plugin-dialog";
import { IconFolder2OutlineDuo18 } from "nucleo-ui-outline-duo-18";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function SettingsDialog({ open: isOpen, onOpenChange }: SettingsDialogProps) {
  const {
    strokeWidth,
    setStrokeWidth,
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
  } = useSettingsStore();
  const { mode, setMode } = useThemeStore();
  const [customizerOpen, setCustomizerOpen] = useState(false);

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

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Default Stroke Width</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
              >
                -
              </Button>
              <span className="w-8 text-center text-sm">{strokeWidth}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStrokeWidth(Math.min(100, strokeWidth + 1))}
              >
                +
              </Button>
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
              <span className="w-8 text-center text-sm tabular-nums">{sketchiness.toFixed(1)}</span>
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
                <IconFolder2OutlineDuo18 className="size-4" />
                Browse
              </Button>
            </div>
          </div>

          {defaultSaveLocation && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Auto-save to default location</span>
                <span className="text-xs text-muted-foreground">Skip the save dialog</span>
              </div>
              <Button
                variant={autoSaveToDefault ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoSaveToDefault(!autoSaveToDefault)}
              >
                {autoSaveToDefault ? "On" : "Off"}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Close after saving</span>
              <span className="text-xs text-muted-foreground">Exit the app after save</span>
            </div>
            <Button
              variant={closeAfterSave ? "default" : "outline"}
              size="sm"
              onClick={() => setCloseAfterSave(!closeAfterSave)}
            >
              {closeAfterSave ? "On" : "Off"}
            </Button>
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
        </div>

        <div className="text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Ctrl+,</kbd> to open
          settings
        </div>

        <ThemeCustomizerDialog open={customizerOpen} onOpenChange={setCustomizerOpen} />
      </DialogContent>
    </Dialog>
  );
}
