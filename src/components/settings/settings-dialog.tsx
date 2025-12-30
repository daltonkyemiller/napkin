import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/stores/canvas-store";
import { useThemeStore, type ThemeMode } from "@/stores/theme-store";
import { ThemeCustomizerDialog } from "./theme-customizer-dialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { strokeWidth, setStrokeWidth, fontSize, setFontSize } = useCanvasStore();
  const { mode, setMode } = useThemeStore();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onClick={() => setStrokeWidth(Math.min(20, strokeWidth + 1))}
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

          <div className="flex items-center justify-between">
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
              <span className="text-xs text-muted-foreground">
                Paste a shadcn/ui theme CSS
              </span>
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
      </DialogContent>

      <ThemeCustomizerDialog open={customizerOpen} onOpenChange={setCustomizerOpen} />
    </Dialog>
  );
}
