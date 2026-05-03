import { Shape } from "react-konva";
import type Konva from "konva";
import { drawRoughDrawable } from "@/lib/rough-draw";
import type { Annotation, ArrowAnnotation } from "@/types";
import type { ShapeRenderContext } from "./types";
import {
  calculateBendedArrow,
  calculateStraightArrow,
  drawArrowhead,
  type ArrowGeometry,
} from "./arrow-geometry";

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

  return renderSmoothArrow(annotation, arrowCommonProps, arrowDrawOffset, {
    startX,
    startY,
    endX,
    endY,
    bend,
    pointerLength,
    pointerWidth,
  });
}

const SKETCHY_SHORTEN_FACTOR = 0.7;

function renderSketchyArrow(
  annotation: ArrowAnnotation,
  arrowCommonProps: Record<string, unknown>,
  arrowDrawOffset: { x: number; y: number },
  geo: ArrowGeometry,
  getRoughDrawable: ShapeRenderContext["getRoughDrawable"],
) {
  const { startX, startY, endX, endY, bend, pointerLength, pointerWidth } = geo;
  const cacheKey = `${startX}-${startY}-${endX}-${endY}-${bend}-${annotation.stroke}-${annotation.strokeWidth}-${annotation.sketchiness}`;
  const sketchyShortenBy = pointerLength * SKETCHY_SHORTEN_FACTOR;

  if (bend !== 0) {
    const { ctrlX, ctrlY, angle, shortenedEndX, shortenedEndY } = calculateBendedArrow(
      geo,
      sketchyShortenBy,
    );

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
            gen.path(
              `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${shortenedEndX} ${shortenedEndY}`,
              {
                stroke: annotation.stroke,
                strokeWidth: annotation.strokeWidth * 1.5,
                roughness: annotation.sketchiness,
                bowing: annotation.sketchiness,
              },
            ),
          );
          drawRoughDrawable(ctx._context, drawable);
          drawArrowhead(
            ctx._context,
            endX,
            endY,
            angle,
            pointerLength,
            pointerWidth,
            annotation.stroke,
            annotation.strokeWidth,
          );
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

  const { angle, shortenedEndX, shortenedEndY } = calculateStraightArrow(geo, sketchyShortenBy);

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
          gen.line(startX, startY, shortenedEndX, shortenedEndY, {
            stroke: annotation.stroke,
            strokeWidth: annotation.strokeWidth * 1.5,
            roughness: annotation.sketchiness,
            bowing: annotation.sketchiness,
          }),
        );
        drawRoughDrawable(ctx._context, drawable);
        drawArrowhead(
          ctx._context,
          endX,
          endY,
          angle,
          pointerLength,
          pointerWidth,
          annotation.stroke,
          annotation.strokeWidth,
        );
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
  const smoothShortenBy = annotation.strokeWidth / 2;

  if (bend !== 0) {
    const { ctrlX, ctrlY, angle, shortenedEndX, shortenedEndY } = calculateBendedArrow(
      geo,
      smoothShortenBy,
    );

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

          drawArrowhead(
            ctx._context,
            endX,
            endY,
            angle,
            pointerLength,
            pointerWidth,
            annotation.stroke,
            annotation.strokeWidth,
          );

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

  const { angle, shortenedEndX, shortenedEndY } = calculateStraightArrow(geo, smoothShortenBy);

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
        ctx.lineTo(shortenedEndX, shortenedEndY);
        ctx.strokeStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        drawArrowhead(
          ctx._context,
          endX,
          endY,
          angle,
          pointerLength,
          pointerWidth,
          annotation.stroke,
          annotation.strokeWidth,
        );

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
