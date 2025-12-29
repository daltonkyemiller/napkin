import { useRef, useEffect, useState, useCallback } from "react";
import { motion, type MotionProps } from "motion/react";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { IconPenOutlineDuo18 } from "nucleo-ui-outline-duo-18";
import type { BlendMode } from "@/types";

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "overlay", label: "Overlay" },
  { value: "hard-light", label: "Hard Light" },
  { value: "color-burn", label: "Color Burn" },
];

interface FloatingElementToolbarProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function FloatingElementToolbar({ containerRef }: FloatingElementToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [isVisible, setIsVisible] = useState(false);

  const { selectedIds } = useCanvasStore();
  const { annotations, updateAnnotation } = useAnnotationStore();

  const selectedBlendableAnnotations = annotations.filter(
    (a) =>
      selectedIds.includes(a.id) &&
      (a.type === "circle" || a.type === "rectangle" || a.type === "arrow" || a.type === "freehand"),
  );

  const hasBlendableSelection = selectedBlendableAnnotations.length > 0;

  const selectedSketchyAnnotations = annotations.filter(
    (a) =>
      selectedIds.includes(a.id) &&
      (a.type === "circle" || a.type === "rectangle" || a.type === "arrow"),
  );
  const hasSketchySelection = selectedSketchyAnnotations.length > 0;
  const allSketchy =
    hasSketchySelection && selectedSketchyAnnotations.every((a) => "sketchy" in a && a.sketchy);

  const currentBlendMode = hasBlendableSelection
    ? (selectedBlendableAnnotations[0] as { blendMode?: BlendMode }).blendMode ?? "source-over"
    : "source-over";

  const handleSketchyToggle = () => {
    const newSketchy = !allSketchy;
    for (const annotation of selectedSketchyAnnotations) {
      updateAnnotation(annotation.id, { sketchy: newSketchy });
    }
  };

  const handleBlendModeChange = (mode: BlendMode | null) => {
    if (!mode) return;
    for (const annotation of selectedBlendableAnnotations) {
      updateAnnotation(annotation.id, { blendMode: mode });
    }
  };

  const updatePosition = useCallback(() => {
    if (!hasBlendableSelection || !containerRef.current || !toolbarRef.current) {
      setIsVisible(false);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const annotation of selectedBlendableAnnotations) {
      if (annotation.type === "circle") {
        minX = Math.min(minX, annotation.x - annotation.radius);
        minY = Math.min(minY, annotation.y - annotation.radius);
        maxX = Math.max(maxX, annotation.x + annotation.radius);
        maxY = Math.max(maxY, annotation.y + annotation.radius);
      } else if (annotation.type === "rectangle") {
        minX = Math.min(minX, annotation.x);
        minY = Math.min(minY, annotation.y);
        maxX = Math.max(maxX, annotation.x + annotation.width);
        maxY = Math.max(maxY, annotation.y + annotation.height);
      } else if (annotation.type === "arrow" || annotation.type === "freehand") {
        const points = annotation.points;
        for (let i = 0; i < points.length; i += 2) {
          const px = annotation.x + points[i];
          const py = annotation.y + points[i + 1];
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
    }

    if (minX === Infinity) {
      setIsVisible(false);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const toolbarHeight = toolbarRect.height || 44;
    const toolbarWidth = toolbarRect.width || 200;
    const gap = 12;
    const padding = 8;

    const centerX = (minX + maxX) / 2;

    let left = centerX - toolbarWidth / 2;
    let top = minY - toolbarHeight - gap;

    if (top < padding) {
      top = maxY + gap;
    }

    left = Math.max(padding, Math.min(left, containerRect.width - toolbarWidth - padding));
    top = Math.max(padding, Math.min(top, containerRect.height - toolbarHeight - padding));

    setPosition({ left, top });
    setIsVisible(true);
  }, [hasBlendableSelection, selectedBlendableAnnotations, containerRef]);

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

  if (!hasBlendableSelection) return null;

  return (
    <motion.div
      ref={toolbarRef}
      {...motionProps}
      style={{ position: "absolute", zIndex: 50 }}
      className="flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg"
    >
      {hasSketchySelection && (
        <Toggle
          pressed={allSketchy}
          onPressedChange={handleSketchyToggle}
          title="Sketchy style"
          size="sm"
        >
          <IconPenOutlineDuo18 />
          <span className="text-xs">Sketchy</span>
        </Toggle>
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
    </motion.div>
  );
}
