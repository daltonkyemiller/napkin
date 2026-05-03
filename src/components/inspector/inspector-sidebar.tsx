import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { NumberScrubber } from "@/components/ui/number-scrubber";
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
import {
  useCanvasStore,
  calculateSketchiness,
  type SketchinessPreset,
} from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useAnnotationsByType } from "@/hooks/use-annotations-by-type";
import { FONT_FAMILIES } from "@/constants";
import type { AnnotationType, BlendMode, TextAnnotation } from "@/types";

const SHAPE_TYPES: AnnotationType[] = ["circle", "rectangle", "arrow", "freehand"];
const TEXT_TYPES: AnnotationType[] = ["text"];
const SKETCHABLE_TYPES: AnnotationType[] = ["circle", "rectangle", "arrow"];

const SKETCHINESS_PRESETS: { value: SketchinessPreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "subtle", label: "Subtle" },
  { value: "medium", label: "Med" },
  { value: "heavy", label: "Heavy" },
];

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "overlay", label: "Overlay" },
  { value: "hard-light", label: "Hard Light" },
  { value: "color-burn", label: "Color Burn" },
];

const STROKE_WIDTH_SNAP_POINTS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 100];
const FONT_SIZE_SNAP_POINTS = [8, 10, 12, 14, 16, 18, 20, 24, 32, 48, 64, 96, 128];

export function InspectorSidebar() {
  const { selectedIds, imageWidth, imageHeight } = useCanvasStore();
  const { annotations, updateAnnotation } = useAnnotationStore();

  const selectedShapeAnnotations = useAnnotationsByType(annotations, selectedIds, SHAPE_TYPES);
  const selectedTextAnnotations = useAnnotationsByType<TextAnnotation>(
    annotations,
    selectedIds,
    TEXT_TYPES,
  );
  const selectedSketchableAnnotations = useAnnotationsByType(
    annotations,
    selectedIds,
    SKETCHABLE_TYPES,
  );

  const hasShapeSelection = selectedShapeAnnotations.length > 0;
  const hasTextSelection = selectedTextAnnotations.length > 0;
  const hasSketchableSelection = selectedSketchableAnnotations.length > 0;

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

  const handleSketchinessPresetChange = (preset: SketchinessPreset) => {
    const sketchiness = calculateSketchiness(preset, imageWidth, imageHeight);
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
                <NumberScrubber
                  label="Stroke Width"
                  value={currentStrokeWidth}
                  onValueChange={handleStrokeWidthChange}
                  min={1}
                  max={100}
                  step={1}
                  unit="px"
                  snapPoints={STROKE_WIDTH_SNAP_POINTS}
                />
              </div>

              {hasSketchableSelection && (
                <div className="space-y-3">
                  <span className="text-xs font-medium text-muted-foreground">Sketchiness</span>
                  <div className="flex gap-1">
                    {SKETCHINESS_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs px-1"
                        onClick={() => handleSketchinessPresetChange(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
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
                <NumberScrubber
                  label="Font Size"
                  value={currentFontSize}
                  onValueChange={handleFontSizeChange}
                  min={8}
                  max={128}
                  step={1}
                  unit="px"
                  snapPoints={FONT_SIZE_SNAP_POINTS}
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
