import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/stores/canvas-store";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { strokeWidth, setStrokeWidth, fontSize, setFontSize } = useCanvasStore();

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
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Ctrl+,</kbd> to open
          settings
        </div>
      </DialogContent>
    </Dialog>
  );
}
