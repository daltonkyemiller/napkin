import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { FONT_FAMILIES } from "@/constants";
import type { BlendMode, TextAnnotation } from "@/types";

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "overlay", label: "Overlay" },
  { value: "hard-light", label: "Hard Light" },
  { value: "color-burn", label: "Color Burn" },
];

export function BottomElementToolbar() {
  const { selectedIds } = useCanvasStore();
  const { annotations, updateAnnotation } = useAnnotationStore();

  const selectedShapeAnnotations = useMemo(
    () =>
      annotations.filter(
        (a) =>
          selectedIds.includes(a.id) &&
          (a.type === "circle" ||
            a.type === "rectangle" ||
            a.type === "arrow" ||
            a.type === "freehand"),
      ),
    [annotations, selectedIds],
  );

  const selectedTextAnnotations = useMemo(
    () =>
      annotations.filter(
        (a) => selectedIds.includes(a.id) && a.type === "text",
      ) as TextAnnotation[],
    [annotations, selectedIds],
  );

  const selectedSketchableAnnotations = useMemo(
    () =>
      annotations.filter(
        (a) =>
          selectedIds.includes(a.id) &&
          (a.type === "circle" || a.type === "rectangle" || a.type === "arrow"),
      ),
    [annotations, selectedIds],
  );

  const hasShapeSelection = selectedShapeAnnotations.length > 0;
  const hasTextSelection = selectedTextAnnotations.length > 0;
  const hasSketchableSelection = selectedSketchableAnnotations.length > 0;
  const hasAnySelection = hasShapeSelection || hasTextSelection;

  const currentSketchiness = hasSketchableSelection
    ? ((selectedSketchableAnnotations[0] as { sketchiness?: number }).sketchiness ?? 1.5)
    : 1.5;

  const currentBlendMode = hasShapeSelection
    ? ((selectedShapeAnnotations[0] as { blendMode?: BlendMode }).blendMode ?? "source-over")
    : "source-over";

  const currentStrokeWidth = hasShapeSelection
    ? (selectedShapeAnnotations[0] as { strokeWidth: number }).strokeWidth
    : 3;

  const currentFontFamily = hasTextSelection
    ? selectedTextAnnotations[0].fontFamily
    : FONT_FAMILIES[0];

  const currentFontSize = hasTextSelection ? selectedTextAnnotations[0].fontSize : 24;

  const handleStrokeWidthChange = (value: number | readonly number[]) => {
    const strokeWidth = Array.isArray(value) ? value[0] : value;
    for (const annotation of selectedShapeAnnotations) {
      updateAnnotation(annotation.id, { strokeWidth });
    }
  };

  const handleSketchinessChange = (value: number | readonly number[]) => {
    const sketchiness = Array.isArray(value) ? value[0] : value;
    for (const annotation of selectedSketchableAnnotations) {
      updateAnnotation(annotation.id, { sketchiness });
    }
  };

  const handleBlendModeChange = (mode: BlendMode | null) => {
    if (!mode) return;
    for (const annotation of selectedShapeAnnotations) {
      updateAnnotation(annotation.id, { blendMode: mode });
    }
  };

  const handleFontFamilyChange = (fontFamily: string | null) => {
    if (!fontFamily) return;
    for (const annotation of selectedTextAnnotations) {
      updateAnnotation(annotation.id, { fontFamily });
    }
  };

  const handleFontSizeChange = (value: number | readonly number[]) => {
    const fontSize = Array.isArray(value) ? value[0] : value;
    for (const annotation of selectedTextAnnotations) {
      updateAnnotation(annotation.id, { fontSize });
    }
  };

  if (!hasAnySelection) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm p-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-4">
          {hasShapeSelection && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Stroke</span>
                <Slider
                  className="w-16"
                  value={[currentStrokeWidth]}
                  onValueChange={handleStrokeWidthChange}
                  min={1}
                  max={100}
                  step={1}
                />
                <span className="w-8 text-sm tabular-nums text-muted-foreground">
                  {currentStrokeWidth}px
                </span>
              </div>

              {hasSketchableSelection && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sketch</span>
                  <Slider
                    className="w-16"
                    value={[currentSketchiness]}
                    onValueChange={handleSketchinessChange}
                    min={0}
                    max={3}
                    step={0.5}
                  />
                  <span className="w-8 text-sm tabular-nums text-muted-foreground">
                    {currentSketchiness.toFixed(1)}
                  </span>
                </div>
              )}

              <Select value={currentBlendMode} onValueChange={handleBlendModeChange}>
                <SelectTrigger className="h-9 w-32 text-sm">
                  <span>{BLEND_MODES.find((m) => m.value === currentBlendMode)?.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {BLEND_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {hasTextSelection && (
            <>
              <Combobox
                value={currentFontFamily}
                onValueChange={(value) => handleFontFamilyChange(value as string | null)}
                items={FONT_FAMILIES}
                filter={(item, query) => item.toLowerCase().includes(query.toLowerCase())}
              >
                <ComboboxInput placeholder="Search fonts..." className="h-9 w-48 text-sm" />
                <ComboboxContent>
                  <ComboboxList>
                    {(font: string) => (
                      <ComboboxItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                  <ComboboxEmpty>No fonts found</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Size</span>
                <Slider
                  className="w-16"
                  value={[currentFontSize]}
                  onValueChange={handleFontSizeChange}
                  min={8}
                  max={128}
                  step={1}
                />
                <span className="w-8 text-sm tabular-nums text-muted-foreground">
                  {currentFontSize}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}