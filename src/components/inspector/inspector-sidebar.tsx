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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useAnnotationsByType } from "@/hooks/use-annotations-by-type";
import { FONT_FAMILIES } from "@/constants";
import type { AnnotationType, BlendMode, TextAnnotation } from "@/types";

const SHAPE_TYPES: AnnotationType[] = ["circle", "rectangle", "arrow", "freehand"];
const TEXT_TYPES: AnnotationType[] = ["text"];
const SKETCHABLE_TYPES: AnnotationType[] = ["circle", "rectangle", "arrow"];

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "overlay", label: "Overlay" },
  { value: "hard-light", label: "Hard Light" },
  { value: "color-burn", label: "Color Burn" },
];

export function InspectorSidebar() {
  const { selectedIds } = useCanvasStore();
  const { annotations, updateAnnotation } = useAnnotationStore();

  const selectedShapeAnnotations = useAnnotationsByType(annotations, selectedIds, SHAPE_TYPES);
  const selectedTextAnnotations = useAnnotationsByType<TextAnnotation>(annotations, selectedIds, TEXT_TYPES);
  const selectedSketchableAnnotations = useAnnotationsByType(annotations, selectedIds, SKETCHABLE_TYPES);

  const hasShapeSelection = selectedShapeAnnotations.length > 0;
  const hasTextSelection = selectedTextAnnotations.length > 0;
  const hasSketchableSelection = selectedSketchableAnnotations.length > 0;

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

  const selectionLabel = useMemo(() => {
    const count = selectedIds.length;
    if (count === 0) return "Nothing selected";
    if (count === 1) {
      const annotation = annotations.find((a) => a.id === selectedIds[0]);
      if (annotation) {
        const typeLabels: Record<string, string> = {
          circle: "Circle",
          rectangle: "Rectangle",
          arrow: "Arrow",
          freehand: "Freehand",
          text: "Text",
          highlighter: "Highlighter",
        };
        return typeLabels[annotation.type] || "Element";
      }
    }
    return `${count} elements`;
  }, [selectedIds, annotations]);

  return (
    <div className="flex h-full w-64 flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-sm font-semibold">{selectionLabel}</h2>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4">
          {hasShapeSelection && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Stroke Width</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {currentStrokeWidth}px
                  </span>
                </div>
                <Slider
                  value={[currentStrokeWidth]}
                  onValueChange={handleStrokeWidthChange}
                  min={1}
                  max={100}
                  step={1}
                />
              </div>

              {hasSketchableSelection && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Sketchiness</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {currentSketchiness.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[currentSketchiness]}
                    onValueChange={handleSketchinessChange}
                    min={0}
                    max={3}
                    step={0.5}
                  />
                </div>
              )}

              <div className="space-y-3">
                <span className="text-xs font-medium text-muted-foreground">Blend Mode</span>
                <Select value={currentBlendMode} onValueChange={handleBlendModeChange}>
                  <SelectTrigger className="w-full text-sm">
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
              </div>
            </>
          )}

          {hasTextSelection && (
            <>
              <div className="space-y-3">
                <span className="text-xs font-medium text-muted-foreground">Font Family</span>
                <Combobox
                  value={currentFontFamily}
                  onValueChange={(value) => handleFontFamilyChange(value as string | null)}
                  items={FONT_FAMILIES}
                  filter={(item, query) => item.toLowerCase().includes(query.toLowerCase())}
                >
                  <ComboboxInput placeholder="Search fonts..." className="w-full text-sm" />
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Font Size</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {currentFontSize}px
                  </span>
                </div>
                <Slider
                  value={[currentFontSize]}
                  onValueChange={handleFontSizeChange}
                  min={8}
                  max={128}
                  step={1}
                />
              </div>
            </>
          )}

          {!hasShapeSelection && !hasTextSelection && (
            <p className="text-sm text-muted-foreground">
              Select an element to edit its properties.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
