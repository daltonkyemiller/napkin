import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

const EXAMPLE_CSS = `/* Paste your shadcn theme CSS here */
/* Example format: */

:root {
  --background: oklch(0.98 0 0);
  --foreground: oklch(0.14 0 0);
  --primary: oklch(0.21 0 0);
  --primary-foreground: oklch(0.98 0 0);
  /* ... more variables */
}

.dark {
  --background: oklch(0.14 0 0);
  --foreground: oklch(0.98 0 0);
  --primary: oklch(0.92 0 0);
  --primary-foreground: oklch(0.21 0 0);
  /* ... more variables */
}`;

interface ThemeCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeCustomizerDialog({ open, onOpenChange }: ThemeCustomizerDialogProps) {
  const { customCss, setCustomCss, resetCustomCss } = useThemeStore();
  const [cssValue, setCssValue] = useState(customCss || "");
  const [error, setError] = useState<string | null>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setCssValue(customCss || "");
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const validateCss = (css: string): boolean => {
    if (!css.trim()) return true;
    
    const hasRoot = css.includes(":root") || css.includes(".dark");
    if (!hasRoot) {
      setError("CSS should contain :root or .dark selectors with CSS variables");
      return false;
    }
    
    const varPattern = /--[\w-]+\s*:/;
    if (!varPattern.test(css)) {
      setError("CSS should contain CSS custom properties (--variable-name)");
      return false;
    }
    
    return true;
  };

  const handleApply = async () => {
    const trimmed = cssValue.trim();
    
    if (!validateCss(trimmed)) {
      return;
    }
    
    setError(null);
    await setCustomCss(trimmed || null);
    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetCustomCss();
    setCssValue("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-[60] data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0" />
        <DialogPrimitive.Popup className="bg-background ring-foreground/10 fixed top-1/2 left-1/2 z-[60] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 text-sm ring-1 duration-100 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95">
          <DialogPrimitive.Title className="font-medium leading-none">
            Customize Theme
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-muted-foreground mt-2 text-sm">
            Paste a shadcn/ui theme CSS to customize the app appearance. The CSS should contain
            :root and .dark selectors with CSS custom properties.
          </DialogPrimitive.Description>

          <div className="mt-4 flex flex-col gap-3">
            <Textarea
              value={cssValue}
              onChange={(e) => {
                setCssValue(e.target.value);
                setError(null);
              }}
              placeholder={EXAMPLE_CSS}
              className={cn(
                "h-80 font-mono text-xs",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            
            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}

            <div className="text-muted-foreground text-xs">
              Tip: You can generate themes at{" "}
              <a
                href="https://ui.shadcn.com/themes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                ui.shadcn.com/themes
              </a>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <DialogPrimitive.Close render={<Button variant="outline" />}>
                Cancel
              </DialogPrimitive.Close>
              <Button onClick={handleApply}>Apply Theme</Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
