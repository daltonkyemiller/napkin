import type Konva from "konva";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable } from "roughjs/bin/core";
import type { Annotation, TextAnnotation } from "@/types";

export interface CommonProps {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  draggable: boolean;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragStart: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformStart: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

export interface ShapeRenderContext {
  isTransformingAnnotation: boolean;
  selectedIds: string[];
  getRoughDrawable: (
    id: string,
    cacheKey: string,
    createDrawable: (gen: RoughGenerator) => Drawable,
  ) => Drawable;
}

export interface AnnotationRendererProps {
  annotation: Annotation;
  activeTool: string;
  selectedIds: string[];
  isTransformingAnnotation: boolean;
  getRoughDrawable: (
    id: string,
    cacheKey: string,
    createDrawable: (gen: RoughGenerator) => Drawable,
  ) => Drawable;
  onAnnotationClick: (e: Konva.KonvaEventObject<MouseEvent>, annotation: Annotation) => void;
  onDragStart: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformStart: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onTextDblClick: (annotation: TextAnnotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  setIsTransformingAnnotation: (value: boolean) => void;
}

export function buildCommonProps(
  annotation: Annotation,
  activeTool: string,
  onAnnotationClick: (e: Konva.KonvaEventObject<MouseEvent>, annotation: Annotation) => void,
  onDragStart: () => void,
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void,
  onTransformStart: () => void,
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void,
): CommonProps {
  return {
    id: annotation.id,
    x: annotation.x,
    y: annotation.y,
    rotation: annotation.rotation ?? 0,
    scaleX: annotation.scaleX ?? 1,
    scaleY: annotation.scaleY ?? 1,
    draggable: activeTool === "select",
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onAnnotationClick(e, annotation),
    onDragStart,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
  };
}
