import Color from "color";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

interface ColorPickerContextValue {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  mode: string;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setLightness: (lightness: number) => void;
  setAlpha: (alpha: number) => void;
  setMode: (mode: string) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined);

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPickerProvider");
  }

  return context;
};

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
  value?: Parameters<typeof Color>[0];
  defaultValue?: Parameters<typeof Color>[0];
  onChange?: (value: Parameters<typeof Color.rgb>[0]) => void;
};

export const ColorPicker = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const selectedColor = Color(value || defaultValue);

  const [hue, setHue] = useState(() => {
    const h = selectedColor.hue();
    return Number.isNaN(h) ? 0 : h;
  });
  const [saturation, setSaturation] = useState(() => selectedColor.saturationl());
  const [lightness, setLightness] = useState(() => selectedColor.lightness());
  const [alpha, setAlpha] = useState((selectedColor.alpha() ?? 1) * 100);
  const [mode, setMode] = useState("hex");

  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (onChangeRef.current) {
      const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);
      const rgba = color.rgb().array();
      onChangeRef.current([rgba[0], rgba[1], rgba[2], alpha / 100]);
    }
  }, [hue, saturation, lightness, alpha]);

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setMode,
      }}
    >
      <div className={cn("flex size-full flex-col gap-4", className)} {...(props as any)} />
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(({ className, ...props }: ColorPickerSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const { hue, setSaturation, setLightness } = useColorPicker();

  const backgroundGradient = useMemo(() => {
    return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`;
  }, [hue]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!(isDragging && containerRef.current)) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      setPositionX(x);
      setPositionY(y);
      setSaturation(x * 100);
      const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x);
      const lightness = topLightness * (1 - y);

      setLightness(lightness);
    },
    [isDragging, setSaturation, setLightness],
  );

  useEffect(() => {
    const handlePointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, handlePointerMove]);

  return (
    <div
      className={cn("relative size-full cursor-crosshair rounded", className)}
      onPointerDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
        handlePointerMove(e.nativeEvent);
      }}
      ref={containerRef}
      style={{
        background: backgroundGradient,
      }}
      {...(props as any)}
    >
      <div
        className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
        style={{
          left: `${positionX * 100}%`,
          top: `${positionY * 100}%`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
});

ColorPickerSelection.displayName = "ColorPickerSelection";

export type ColorPickerHueProps = ComponentProps<typeof SliderPrimitive.Root>;

export const ColorPickerHue = ({ className, ...props }: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  return (
    <SliderPrimitive.Root
      className="w-full"
      max={360}
      onValueChange={(value) => {
        const val = Array.isArray(value) ? value[0] : value;
        setHue(val);
      }}
      step={1}
      value={[hue]}
      {...props}
    >
      <SliderPrimitive.Control
        className={cn("relative flex h-4 w-full touch-none items-center select-none", className)}
      >
        <SliderPrimitive.Track className="relative h-3 w-full overflow-hidden rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
          <SliderPrimitive.Indicator className="absolute h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block size-4 shrink-0 cursor-pointer rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
};

export type ColorPickerAlphaProps = ComponentProps<typeof SliderPrimitive.Root>;

export const ColorPickerAlpha = ({ className, ...props }: ColorPickerAlphaProps) => {
  const { alpha, setAlpha } = useColorPicker();

  return (
    <SliderPrimitive.Root
      className="w-full"
      max={100}
      onValueChange={(value) => {
        const val = Array.isArray(value) ? value[0] : value;
        setAlpha(val);
      }}
      step={1}
      value={[alpha]}
      {...props}
    >
      <SliderPrimitive.Control
        className={cn("relative flex h-4 w-full touch-none items-center select-none", className)}
      >
        <SliderPrimitive.Track
          className="relative h-3 w-full overflow-hidden rounded-full"
          style={{
            background:
              'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-black/50" />
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-transparent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block size-4 shrink-0 cursor-pointer rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({ className, ...props }: ColorPickerEyeDropperProps) => {
  const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker();

  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const color = Color(result.sRGBHex);
      const [h, s, l] = color.hsl().array();

      setHue(h);
      setSaturation(s);
      setLightness(l);
      setAlpha(100);
    } catch (error) {
      console.error("EyeDropper failed:", error);
    }
  };

  return (
    <Button
      className={cn("shrink-0 text-muted-foreground", className)}
      onClick={handleEyeDropper}
      size="icon"
      variant="outline"
      type="button"
      {...(props as any)}
    >
      <Icon name="paintbrush" />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

const formats = ["hex", "rgb", "hsl"];

export const ColorPickerOutput = ({ className, ...props }: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select onValueChange={(value) => value && setMode(value)} value={mode}>
      <SelectTrigger className="h-8 w-16 shrink-0 text-xs" {...(props as any)}>
        {mode.toUpperCase()}
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

type PercentageInputProps = {
  value: number;
  onValueChange?: (value: number) => void;
  className?: string;
};

const PercentageInput = ({ className, value, onValueChange }: PercentageInputProps) => {
  const [localValue, setLocalValue] = useState(String(Math.round(value)));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(Math.round(value)));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strValue = e.target.value;
    setLocalValue(strValue);
    const num = parseInt(strValue, 10);
    if (!isNaN(num) && onValueChange) {
      onValueChange(Math.max(0, Math.min(100, num)));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setLocalValue(String(Math.round(value)));
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className={cn(
          "h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 pr-5 text-xs shadow-none",
          className,
        )}
      />
      <span className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground text-xs pointer-events-none">
        %
      </span>
    </div>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

const HexInput = ({ className }: { className?: string }) => {
  const { hue, saturation, lightness, setHue, setSaturation, setLightness } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness);
  const [localValue, setLocalValue] = useState(color.hex());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(color.hex());
    }
  }, [color, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    try {
      const parsed = Color(value.startsWith("#") ? value : `#${value}`);
      const [h, s, l] = parsed.hsl().array();
      setHue(h || 0);
      setSaturation(s || 0);
      setLightness(l || 0);
    } catch {}
  };

  const handleBlur = () => {
    setIsFocused(false);
    setLocalValue(color.hex());
  };

  return (
    <Input
      className={cn("h-8 flex-1 rounded-r-none bg-secondary px-2 text-xs shadow-none", className)}
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
    />
  );
};

const NumericInput = ({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  className?: string;
}) => {
  const [localValue, setLocalValue] = useState(String(Math.round(value)));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(Math.round(value)));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strValue = e.target.value;
    setLocalValue(strValue);
    const num = parseInt(strValue, 10);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setLocalValue(String(Math.round(value)));
  };

  return (
    <Input
      className={cn("h-8 w-12 bg-secondary px-2 text-xs shadow-none", className)}
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
    />
  );
};

export const ColorPickerFormat = ({ className, ...props }: ColorPickerFormatProps) => {
  const { hue, saturation, lightness, alpha, mode, setHue, setSaturation, setLightness, setAlpha } =
    useColorPicker();
  const color = Color.hsl(hue, saturation, lightness, alpha / 100);

  if (mode === "hex") {
    return (
      <div
        className={cn(
          "relative flex w-full items-center -space-x-px rounded-md shadow-sm",
          className,
        )}
        {...(props as any)}
      >
        <HexInput />
        <PercentageInput value={alpha} onValueChange={setAlpha} />
      </div>
    );
  }

  if (mode === "rgb") {
    const [r, g, b] = color
      .rgb()
      .array()
      .map((v) => Math.round(v));

    const updateFromRgb = (newR: number, newG: number, newB: number) => {
      try {
        const parsed = Color.rgb(newR, newG, newB);
        const [h, s, l] = parsed.hsl().array();
        setHue(h || 0);
        setSaturation(s || 0);
        setLightness(l || 0);
      } catch {}
    };

    return (
      <div
        className={cn("flex items-center -space-x-px rounded-md shadow-sm", className)}
        {...(props as any)}
      >
        <NumericInput
          className="rounded-r-none"
          value={r}
          onChange={(v) => updateFromRgb(v, g, b)}
          min={0}
          max={255}
        />
        <NumericInput
          className="rounded-none"
          value={g}
          onChange={(v) => updateFromRgb(r, v, b)}
          min={0}
          max={255}
        />
        <NumericInput
          className="rounded-none"
          value={b}
          onChange={(v) => updateFromRgb(r, g, v)}
          min={0}
          max={255}
        />
        <PercentageInput value={alpha} onValueChange={setAlpha} />
      </div>
    );
  }

  if (mode === "hsl") {
    return (
      <div
        className={cn("flex items-center -space-x-px rounded-md shadow-sm", className)}
        {...(props as any)}
      >
        <NumericInput
          className="rounded-r-none"
          value={hue}
          onChange={(v) => setHue(((v % 360) + 360) % 360)}
          min={0}
          max={360}
        />
        <NumericInput
          className="rounded-none"
          value={saturation}
          onChange={setSaturation}
          min={0}
          max={100}
        />
        <NumericInput
          className="rounded-none"
          value={lightness}
          onChange={setLightness}
          min={0}
          max={100}
        />
        <PercentageInput value={alpha} onValueChange={setAlpha} />
      </div>
    );
  }

  return null;
};
