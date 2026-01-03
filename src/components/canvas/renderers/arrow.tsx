import { Shape } from "react-konva";
import type Konva from "konva";
import { drawRoughDrawable } from "@/lib/rough-draw";
import type { Annotation, ArrowAnnotation } from "@/types";
import type { ShapeRenderContext } from "./types";

interface ArrowRenderContext extends ShapeRenderContext {
  activeTool: string;
  onAnnotationClick: (e: Konva.KonvaEventObject<MouseEvent>, annotation: Annotation) => void;
  onDragStart: () => void;
  onTransformStart: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  setIsTransformingAnnotation: (value: boolean) => void;
}

export function renderArrow(annotation: ArrowAnnotation, ctx: ArrowRenderContext) {
  const {
    isDrawing,
    isTransformingAnnotation,
    selectedIds,
    getRoughDrawable,
    activeTool,
    onAnnotationClick,
    onDragStart,
    onTransformStart,
    onTransformEnd,
    updateAnnotation,
    setIsTransformingAnnotation,
  } = ctx;

  const [startX, startY, endX, endY] = annotation.points;
  const bend = annotation.bend ?? 0;
  const basePointerLength = annotation.pointerLength ?? 10;
  const basePointerWidth = annotation.pointerWidth ?? 10;
  const pointerLength = basePointerLength + annotation.strokeWidth;
  const pointerWidth = basePointerWidth + annotation.strokeWidth;
  const isBeingTransformed = isTransformingAnnotation && selectedIds.includes(annotation.id);

  const arrowPadding = Math.max(pointerLength, pointerWidth, annotation.strokeWidth) + 5;
  const boundPoints = [startX, startY, endX, endY];
  if (bend !== 0) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    boundPoints.push(midX + (-dy / len) * bend, midY + (dx / len) * bend);
  }
  const arrowXs = boundPoints.filter((_, i) => i % 2 === 0);
  const arrowYs = boundPoints.filter((_, i) => i % 2 === 1);
  const arrowMinX = Math.min(...arrowXs) - arrowPadding;
  const arrowMinY = Math.min(...arrowYs) - arrowPadding;
  const arrowWidth = Math.max(...arrowXs) - Math.min(...arrowXs) + arrowPadding * 2;
  const arrowHeight = Math.max(...arrowYs) - Math.min(...arrowYs) + arrowPadding * 2;

  const arrowCommonProps = {
    id: annotation.id,
    x: annotation.x + arrowMinX,
    y: annotation.y + arrowMinY,
    width: arrowWidth,
    height: arrowHeight,
    rotation: annotation.rotation ?? 0,
    scaleX: annotation.scaleX ?? 1,
    scaleY: annotation.scaleY ?? 1,
    draggable: activeTool === "select",
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onAnnotationClick(e, annotation),
    onDragStart: onDragStart,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateAnnotation(node.id(), {
        x: node.x() - arrowMinX,
        y: node.y() - arrowMinY,
      });
      setIsTransformingAnnotation(false);
    },
    onTransformStart: onTransformStart,
    onTransformEnd: onTransformEnd,
  };

  const arrowDrawOffset = { x: -arrowMinX, y: -arrowMinY };

  if (annotation.sketchiness && !isBeingTransformed && !isDrawing) {
    return renderSketchyArrow(
      annotation,
      arrowCommonProps,
      arrowDrawOffset,
      { startX, startY, endX, endY, bend, pointerLength, pointerWidth },
      getRoughDrawable,
    );
  }

  return renderSmoothArrow(
    annotation,
    arrowCommonProps,
    arrowDrawOffset,
    { startX, startY, endX, endY, bend, pointerLength, pointerWidth },
  );
}

interface ArrowGeometry {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  bend: number;
  pointerLength: number;
  pointerWidth: number;
}

function renderSketchyArrow(
  annotation: ArrowAnnotation,
  arrowCommonProps: Record<string, unknown>,
  arrowDrawOffset: { x: number; y: number },
  geo: ArrowGeometry,
  getRoughDrawable: ShapeRenderContext["getRoughDrawable"],
) {
  const { startX, startY, endX, endY, bend, pointerLength, pointerWidth } = geo;
  const cacheKey = `${startX}-${startY}-${endX}-${endY}-${bend}-${annotation.stroke}-${annotation.strokeWidth}-${annotation.sketchiness}`;

  if (bend !== 0) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / length;
    const perpY = dx / length;
    const ctrlX = midX + perpX * bend;
    const ctrlY = midY + perpY * bend;

    const tangentX = endX - ctrlX;
    const tangentY = endY - ctrlY;
    const angle = Math.atan2(tangentY, tangentX);

    return (
      <Shape
        key={annotation.id}
        {...arrowCommonProps}
        stroke={annotation.stroke}
        strokeWidth={Math.max(annotation.strokeWidth, 15)}
        globalCompositeOperation={annotation.blendMode ?? "source-over"}
        sceneFunc={(ctx) => {
          ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);
          const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
            gen.path(`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`, {
              stroke: annotation.stroke,
              strokeWidth: annotation.strokeWidth * 1.5,
              roughness: annotation.sketchiness,
              bowing: annotation.sketchiness,
            }),
          );
          drawRoughDrawable(ctx._context, drawable);

          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(-pointerLength, -pointerWidth / 2);
          ctx.lineTo(0, 0);
          ctx.lineTo(-pointerLength, pointerWidth / 2);
          ctx.strokeStyle = annotation.stroke;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
          ctx.restore();
        }}
        hitFunc={(ctx, shape) => {
          ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.fillStrokeShape(shape);
        }}
      />
    );
  }

  const straightAngle = Math.atan2(endY - startY, endX - startX);

  return (
    <Shape
      key={annotation.id}
      {...arrowCommonProps}
      stroke={annotation.stroke}
      strokeWidth={Math.max(annotation.strokeWidth, 15)}
      globalCompositeOperation={annotation.blendMode ?? "source-over"}
      sceneFunc={(ctx) => {
        ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);
        const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
          gen.line(startX, startY, endX, endY, {
            stroke: annotation.stroke,
            strokeWidth: annotation.strokeWidth * 1.5,
            roughness: annotation.sketchiness,
            bowing: annotation.sketchiness,
          }),
        );
        drawRoughDrawable(ctx._context, drawable);

        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(straightAngle);
        ctx.beginPath();
        ctx.moveTo(-pointerLength, -pointerWidth / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-pointerLength, pointerWidth / 2);
        ctx.strokeStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      }}
      hitFunc={(ctx, shape) => {
        ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

function renderSmoothArrow(
  annotation: ArrowAnnotation,
  arrowCommonProps: Record<string, unknown>,
  arrowDrawOffset: { x: number; y: number },
  geo: ArrowGeometry,
) {
  const { startX, startY, endX, endY, bend, pointerLength, pointerWidth } = geo;

  if (bend !== 0) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / length;
    const perpY = dx / length;
    const ctrlX = midX + perpX * bend;
    const ctrlY = midY + perpY * bend;

    const tangentX = endX - ctrlX;
    const tangentY = endY - ctrlY;
    const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
    const normTangentX = tangentX / tangentLen;
    const normTangentY = tangentY / tangentLen;
    const angle = Math.atan2(tangentY, tangentX);

    const shortenBy = annotation.strokeWidth / 2;
    const shortenedEndX = endX - normTangentX * shortenBy;
    const shortenedEndY = endY - normTangentY * shortenBy;

    return (
      <Shape
        key={annotation.id}
        {...arrowCommonProps}
        stroke={annotation.stroke}
        strokeWidth={Math.max(annotation.strokeWidth, 15)}
        globalCompositeOperation={annotation.blendMode ?? "source-over"}
        sceneFunc={(ctx) => {
          ctx.save();
          ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, shortenedEndX, shortenedEndY);
          ctx.strokeStyle = annotation.stroke;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.lineCap = "butt";
          ctx.lineJoin = "round";
          ctx.stroke();

          ctx.translate(endX, endY);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(-pointerLength, -pointerWidth / 2);
          ctx.lineTo(0, 0);
          ctx.lineTo(-pointerLength, pointerWidth / 2);
          ctx.strokeStyle = annotation.stroke;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();

          ctx.restore();
        }}
        hitFunc={(ctx, shape) => {
          ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.fillStrokeShape(shape);
        }}
      />
    );
  }

  const straightDx = endX - startX;
  const straightDy = endY - startY;
  const straightLen = Math.sqrt(straightDx * straightDx + straightDy * straightDy) || 1;
  const straightAngle = Math.atan2(straightDy, straightDx);
  const straightShortenBy = annotation.strokeWidth / 2;
  const straightEndX = endX - (straightDx / straightLen) * straightShortenBy;
  const straightEndY = endY - (straightDy / straightLen) * straightShortenBy;

  return (
    <Shape
      key={annotation.id}
      {...arrowCommonProps}
      stroke={annotation.stroke}
      strokeWidth={Math.max(annotation.strokeWidth, 15)}
      globalCompositeOperation={annotation.blendMode ?? "source-over"}
      sceneFunc={(ctx) => {
        ctx.save();
        ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(straightEndX, straightEndY);
        ctx.strokeStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.translate(endX, endY);
        ctx.rotate(straightAngle);
        ctx.beginPath();
        ctx.moveTo(-pointerLength, -pointerWidth / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-pointerLength, pointerWidth / 2);
        ctx.strokeStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.restore();
      }}
      hitFunc={(ctx, shape) => {
        ctx.translate(arrowDrawOffset.x, arrowDrawOffset.y);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}
