import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, type MotionProps } from "motion/react";
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

interface FloatingElementToolbarProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  image: HTMLImageElement | null;
}

export function FloatingElementToolbar({ containerRef, image }: FloatingElementToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);

  const { selectedIds, width: canvasWidth, height: canvasHeight } = useCanvasStore();
  const { annotations, updateAnnotation } = useAnnotationStore();

  const imageTransform = useMemo(() => {
    if (!image || !containerRef.current) return null;
    const containerWidth = containerRef.current.clientWidth || canvasWidth;
    const containerHeight = containerRef.current.clientHeight || canvasHeight;
    const imageScale = Math.min(containerWidth / image.width, containerHeight / image.height, 1);
    const scaledWidth = image.width * imageScale;
    const scaledHeight = image.height * imageScale;
    const imageX = (containerWidth - scaledWidth) / 2;
    const imageY = (containerHeight - scaledHeight) / 2;
    return { imageX, imageY, imageScale };
  }, [image, containerRef, canvasWidth, canvasHeight]);

  useEffect(() => {
    invoke<string[]>("get_system_fonts")
      .then(setSystemFonts)
      .catch(() => {});
  }, []);

  const allFonts = useMemo(() => [...new Set([...FONT_FAMILIES, ...systemFonts])], [systemFonts]);

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

  const updatePosition = useCallback(() => {
    if (!hasAnySelection || !containerRef.current || !toolbarRef.current || !imageTransform) {
      setIsVisible(false);
      return;
    }

    const { imageX, imageY, imageScale } = imageTransform;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const allSelected = [...selectedShapeAnnotations, ...selectedTextAnnotations];

    for (const annotation of allSelected) {
      const scaleX = annotation.scaleX ?? 1;
      const scaleY = annotation.scaleY ?? 1;

      if (annotation.type === "circle") {
        const scaledRadiusX = annotation.radiusX * scaleX;
        const scaledRadiusY = annotation.radiusY * scaleY;
        minX = Math.min(minX, annotation.x - scaledRadiusX);
        minY = Math.min(minY, annotation.y - scaledRadiusY);
        maxX = Math.max(maxX, annotation.x + scaledRadiusX);
        maxY = Math.max(maxY, annotation.y + scaledRadiusY);
      } else if (annotation.type === "rectangle") {
        const scaledWidth = annotation.width * scaleX;
        const scaledHeight = annotation.height * scaleY;
        minX = Math.min(minX, annotation.x);
        minY = Math.min(minY, annotation.y);
        maxX = Math.max(maxX, annotation.x + scaledWidth);
        maxY = Math.max(maxY, annotation.y + scaledHeight);
      } else if (annotation.type === "arrow") {
        const points = annotation.points;
        for (let i = 0; i < points.length; i += 2) {
          const px = annotation.x + points[i] * scaleX;
          const py = annotation.y + points[i + 1] * scaleY;
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      } else if (annotation.type === "freehand") {
        for (const [x, y] of annotation.points) {
          const px = annotation.x + x * scaleX;
          const py = annotation.y + y * scaleY;
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      } else if (annotation.type === "text") {
        minX = Math.min(minX, annotation.x);
        minY = Math.min(minY, annotation.y);
        maxX = Math.max(maxX, annotation.x + (annotation.width ?? 100));
        maxY = Math.max(maxY, annotation.y + annotation.fontSize * 1.2);
      }
    }

    if (minX === Infinity) {
      setIsVisible(false);
      return;
    }

    const screenMinX = imageX + minX * imageScale;
    const screenMinY = imageY + minY * imageScale;
    const screenMaxX = imageX + maxX * imageScale;
    const screenMaxY = imageY + maxY * imageScale;

    const containerRect = containerRef.current.getBoundingClientRect();
    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const toolbarHeight = toolbarRect.height || 44;
    const toolbarWidth = toolbarRect.width || 200;
    const gap = 45;
    const padding = 8;

    const centerX = (screenMinX + screenMaxX) / 2;

    let left = centerX - toolbarWidth / 2;
    let top = screenMinY - toolbarHeight - gap;

    if (top < padding) {
      top = screenMaxY + gap;
    }

    left = Math.max(padding, Math.min(left, containerRect.width - toolbarWidth - padding));
    top = Math.max(padding, Math.min(top, containerRect.height - toolbarHeight - padding));

    setPosition({ left, top });
    setIsVisible(true);
  }, [hasAnySelection, selectedShapeAnnotations, selectedTextAnnotations, containerRef, imageTransform]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updatePosition]);

  const motionProps: MotionProps = {
    initial: { opacity: 0, scale: 0.9, y: 10 },
    animate: {
      opacity: isVisible ? 1 : 0,
      scale: isVisible ? 1 : 0.9,
      y: isVisible ? 0 : 10,
      left: position.left,
      top: position.top,
    },
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      mass: 0.8,
    },
  };

  if (!hasAnySelection) return null;

  return (
    <motion.div
      ref={toolbarRef}
      {...motionProps}
      style={{ position: "absolute", zIndex: 50 }}
      className="flex items-center gap-4 rounded-lg border bg-background px-3 py-2 shadow-lg"
    >
      {hasShapeSelection && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Stroke</span>
            <Slider
              className="w-16"
              value={[currentStrokeWidth]}
              onValueChange={handleStrokeWidthChange}
              min={1}
              max={100}
              step={1}
            />
            <span className="w-6 text-xs tabular-nums text-muted-foreground">
              {currentStrokeWidth}px
            </span>
          </div>

          {hasSketchableSelection && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sketch</span>
              <Slider
                className="w-16"
                value={[currentSketchiness]}
                onValueChange={handleSketchinessChange}
                min={0}
                max={3}
                step={0.5}
              />
              <span className="w-6 text-xs tabular-nums text-muted-foreground">
                {currentSketchiness.toFixed(1)}
              </span>
            </div>
          )}

          <Select value={currentBlendMode} onValueChange={handleBlendModeChange}>
            <SelectTrigger className="h-8 w-28 text-xs">
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
            items={allFonts}
            filter={(item, query) => item.toLowerCase().includes(query.toLowerCase())}
          >
            <ComboboxInput placeholder="Search fonts..." className="h-8 w-44 text-xs" />
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
            <span className="text-xs text-muted-foreground">Size</span>
            <Slider
              className="w-16"
              value={[currentFontSize]}
              onValueChange={handleFontSizeChange}
              min={8}
              max={128}
              step={1}
            />
            <span className="w-6 text-xs tabular-nums text-muted-foreground">
              {currentFontSize}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}
