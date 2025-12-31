import { useState, useEffect } from "react";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  NestedDialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

const ROSE_PINE = {
  base: "0.2136 0.0255 290.94",
  surface: "0.2412 0.0323 289.08",
  overlay: "0.2706 0.0422 289.37",
  muted: "0.5387 0.0438 291.72",
  subtle: "0.6540 0.0445 291.21",
  text: "0.9090 0.0298 289.57",
  love: "0.6974 0.1567 4.14",
  gold: "0.8432 0.1099 74.67",
  rose: "0.8351 0.0550 20.53",
  pine: "0.5282 0.0792 227.29",
  foam: "0.8217 0.0545 209.65",
  iris: "0.7754 0.0946 304.83",
  highlightLow: "0.2512 0.0263 287.39",
  highlightMed: "0.3715 0.0359 291.41",
  highlightHigh: "0.4402 0.0393 290.78",
};

const ROSE_PINE_MOON = {
  base: "0.2609 0.0390 287.95",
  surface: "0.2878 0.0435 289.48",
  overlay: "0.3464 0.0503 289.61",
  muted: "0.5387 0.0438 291.72",
  subtle: "0.6540 0.0445 291.21",
  text: "0.9090 0.0298 289.57",
  love: "0.6974 0.1567 4.14",
  gold: "0.8432 0.1099 74.67",
  rose: "0.7648 0.0969 21.69",
  pine: "0.6158 0.0925 227.31",
  foam: "0.8217 0.0545 209.65",
  iris: "0.7754 0.0946 304.83",
  highlightLow: "0.2892 0.0399 287.44",
  highlightMed: "0.3888 0.0421 289.62",
  highlightHigh: "0.4533 0.0455 291.33",
};

const ROSE_PINE_DAWN = {
  base: "0.9698 0.0112 71.16",
  surface: "0.9868 0.0108 76.46",
  overlay: "0.9390 0.0143 63.70",
  muted: "0.6737 0.0269 298.55",
  subtle: "0.5772 0.0459 290.98",
  text: "0.4599 0.0629 289.79",
  love: "0.5988 0.1072 2.66",
  gold: "0.7576 0.1457 70.50",
  rose: "0.6968 0.1052 23.31",
  pine: "0.4912 0.0769 227.74",
  foam: "0.6287 0.0661 210.11",
  iris: "0.6174 0.0739 305.61",
  highlightLow: "0.9499 0.0101 57.89",
  highlightMed: "0.8922 0.0056 30.16",
  highlightHigh: "0.8431 0.0060 333.18",
};

type RosePinePalette = typeof ROSE_PINE;

function generateThemeCss(light: RosePinePalette, dark: RosePinePalette): string {
  const generateVars = (p: RosePinePalette) => `  --background: oklch(${p.base});
  --foreground: oklch(${p.text});
  --card: oklch(${p.surface});
  --card-foreground: oklch(${p.text});
  --popover: oklch(${p.overlay});
  --popover-foreground: oklch(${p.text});
  --primary: oklch(${p.iris});
  --primary-foreground: oklch(${p.base});
  --secondary: oklch(${p.highlightLow});
  --secondary-foreground: oklch(${p.text});
  --muted: oklch(${p.highlightLow});
  --muted-foreground: oklch(${p.muted});
  --accent: oklch(${p.highlightMed});
  --accent-foreground: oklch(${p.text});
  --destructive: oklch(${p.love});
  --destructive-foreground: oklch(${p.base});
  --border: oklch(${p.highlightHigh});
  --input: oklch(${p.highlightMed});
  --ring: oklch(${p.iris});
  --chart-1: oklch(${p.iris});
  --chart-2: oklch(${p.pine});
  --chart-3: oklch(${p.foam});
  --chart-4: oklch(${p.rose});
  --chart-5: oklch(${p.gold});
  --sidebar: oklch(${p.surface});
  --sidebar-foreground: oklch(${p.text});
  --sidebar-primary: oklch(${p.iris});
  --sidebar-primary-foreground: oklch(${p.base});
  --sidebar-accent: oklch(${p.highlightLow});
  --sidebar-accent-foreground: oklch(${p.text});
  --sidebar-border: oklch(${p.highlightHigh});
  --sidebar-ring: oklch(${p.iris});`;

  return `:root {
${generateVars(light)}
}

.dark {
${generateVars(dark)}
}`;
}

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  css: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "rose-pine",
    name: "Rosé Pine",
    description: "Dawn (light) / Main (dark)",
    css: generateThemeCss(ROSE_PINE_DAWN, ROSE_PINE),
  },
  {
    id: "rose-pine-moon",
    name: "Rosé Pine Moon",
    description: "Dawn (light) / Moon (dark)",
    css: generateThemeCss(ROSE_PINE_DAWN, ROSE_PINE_MOON),
  },
];

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
  const [cssValue, setCssValue] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCssValue(customCss || "");
      setSelectedPreset(null);
      setError(null);
    }
  }, [open, customCss]);

  const handlePresetChange = (presetId: string | null) => {
    if (!presetId) return;
    setSelectedPreset(presetId);
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCssValue(preset.css);
      setError(null);
    }
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
    setSelectedPreset(null);
    setError(null);
    onOpenChange(false);
  };

  const getSelectedPresetDisplay = () => {
    if (!selectedPreset) return null;
    const preset = THEME_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset) return null;
    return (
      <div className="flex flex-col items-start">
        <span>{preset.name}</span>
        <span className="text-muted-foreground text-xs">{preset.description}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NestedDialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Customize Theme</DialogTitle>
          <DialogDescription>
            Choose a preset theme or paste custom shadcn/ui CSS.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Preset Themes</span>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedPreset ? (
                    getSelectedPresetDisplay()
                  ) : (
                    <span className="text-muted-foreground">Select a preset theme...</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent positionerClassName="z-[70]">
                {THEME_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex flex-col items-start">
                      <span>{preset.name}</span>
                      <span className="text-muted-foreground text-xs">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-1 min-h-0 flex-col gap-2">
            <span className="text-sm font-medium">Custom CSS</span>
            <Textarea
              value={cssValue}
              onChange={(e) => {
                setCssValue(e.target.value);
                setSelectedPreset(null);
                setError(null);
              }}
              placeholder={EXAMPLE_CSS}
              className={cn(
                "flex-1 min-h-0 font-mono text-xs resize-none",
                error && "border-destructive focus-visible:ring-destructive",
              )}
            />
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <div className="text-muted-foreground text-xs">
            Tip: You can generate themes at{" "}
            <a
              href="https://tweakcn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              tweakcn.com
            </a>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply Theme</Button>
          </div>
        </div>
      </NestedDialogContent>
    </Dialog>
  );
}
