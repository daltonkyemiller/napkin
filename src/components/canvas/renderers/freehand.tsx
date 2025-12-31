import { Shape } from "react-konva";
import type Konva from "konva";
import { getFreehandStroke } from "@/lib/freehand";
import type { Annotation, FreehandAnnotation } from "@/types";

interface FreehandRenderContext {
  activeTool: string;
  onAnnotationClick: (e: Konva.KonvaEventObject<MouseEvent>, annotation: Annotation) => void;
  onDragStart: () => void;
  onTransformStart: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  setIsTransformingAnnotation: (value: boolean) => void;
}

export function renderFreehand(annotation: FreehandAnnotation, ctx: FreehandRenderContext) {
  const {
    activeTool,
    onAnnotationClick,
    onDragStart,
    onTransformStart,
    onTransformEnd,
    updateAnnotation,
    setIsTransformingAnnotation,
  } = ctx;

  const { path: pathData, bounds } = getFreehandStroke(annotation.points, {
    size: annotation.strokeWidth * 2,
  });
  const padding = 2;
  const offsetX = bounds.minX - padding;
  const offsetY = bounds.minY - padding;
  const shapeWidth = bounds.width + padding * 2;
  const shapeHeight = bounds.height + padding * 2;

  return (
    <Shape
      key={annotation.id}
      id={annotation.id}
      x={annotation.x + offsetX}
      y={annotation.y + offsetY}
      width={shapeWidth}
      height={shapeHeight}
      rotation={annotation.rotation ?? 0}
      scaleX={annotation.scaleX ?? 1}
      scaleY={annotation.scaleY ?? 1}
      draggable={activeTool === "select"}
      onClick={(e: Konva.KonvaEventObject<MouseEvent>) => onAnnotationClick(e, annotation)}
      onDragStart={onDragStart}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        updateAnnotation(node.id(), {
          x: node.x() - offsetX,
          y: node.y() - offsetY,
        });
        setIsTransformingAnnotation(false);
      }}
      onTransformStart={onTransformStart}
      onTransformEnd={onTransformEnd}
      sceneFunc={(ctx) => {
        if (!pathData) return;
        ctx.translate(-offsetX, -offsetY);
        const path = new Path2D(pathData);
        ctx.fillStyle = annotation.stroke;
        ctx.fill(path);
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shapeWidth, shapeHeight);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      globalCompositeOperation={annotation.blendMode ?? "source-over"}
    />
  );
}
