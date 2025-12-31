import { useMemo, useCallback, useState } from "react";
import type Konva from "konva";
import type {
  Annotation,
  CircleAnnotation,
  RectangleAnnotation,
  ArrowAnnotation,
} from "@/types";

interface UseAnnotationInteractionParams {
  annotations: Annotation[];
  activeTool: string;
  selectedIds: string[];
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
}

export function useAnnotationInteraction({
  annotations,
  activeTool,
  selectedIds,
  setSelectedId,
  setSelectedIds,
  updateAnnotation,
}: UseAnnotationInteractionParams) {
  const [isTransformingAnnotation, setIsTransformingAnnotation] = useState(false);

  const handleAnnotationClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, annotation: Annotation) => {
      if (activeTool !== "select") return;

      e.cancelBubble = true;
      const isShift = e.evt.shiftKey;

      if (isShift) {
        if (selectedIds.includes(annotation.id)) {
          const newSelection = selectedIds.filter((id) => id !== annotation.id);
          setSelectedIds(newSelection);
          setSelectedId(newSelection[newSelection.length - 1] ?? null);
        } else {
          setSelectedIds([...selectedIds, annotation.id]);
          setSelectedId(annotation.id);
        }
      } else {
        setSelectedId(annotation.id);
        setSelectedIds([annotation.id]);
      }
    },
    [activeTool, selectedIds, setSelectedId, setSelectedIds],
  );

  const handleDragStart = useCallback(() => {
    setIsTransformingAnnotation(true);
  }, []);

  const handleTransformStart = useCallback(() => {
    setIsTransformingAnnotation(true);
  }, []);

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const id = node.id();
      const annotation = annotations.find((a) => a.id === id);
      if (!annotation) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      if (annotation.type === "rectangle") {
        const rect = annotation as RectangleAnnotation;
        updateAnnotation(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: rect.width * scaleX,
          height: rect.height * scaleY,
          scaleX: 1,
          scaleY: 1,
        });
        node.scaleX(1);
        node.scaleY(1);
      } else if (annotation.type === "circle") {
        const circle = annotation as CircleAnnotation;
        updateAnnotation(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          radiusX: circle.radiusX * Math.abs(scaleX),
          radiusY: circle.radiusY * Math.abs(scaleY),
          scaleX: 1,
          scaleY: 1,
        });
        node.scaleX(1);
        node.scaleY(1);
      } else {
        updateAnnotation(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: scaleX,
          scaleY: scaleY,
        });
      }
      setIsTransformingAnnotation(false);
    },
    [annotations, updateAnnotation],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateAnnotation(node.id(), {
        x: node.x(),
        y: node.y(),
      });
      setIsTransformingAnnotation(false);
    },
    [updateAnnotation],
  );

  const selectedRectangle = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const annotation = annotations.find((a) => a.id === selectedIds[0]);
    if (annotation?.type !== "rectangle") return null;
    return annotation as RectangleAnnotation;
  }, [selectedIds, annotations]);

  const selectedArrow = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const annotation = annotations.find((a) => a.id === selectedIds[0]);
    if (annotation?.type !== "arrow") return null;
    return annotation as ArrowAnnotation;
  }, [selectedIds, annotations]);

  return {
    isTransformingAnnotation,
    setIsTransformingAnnotation,
    handleAnnotationClick,
    handleDragStart,
    handleDragEnd,
    handleTransformStart,
    handleTransformEnd,
    selectedRectangle,
    selectedArrow,
  };
}
