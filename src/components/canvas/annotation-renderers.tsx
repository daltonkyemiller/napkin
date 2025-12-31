import { Rect, Circle, Text, Line, Shape } from "react-konva";
import type Konva from "konva";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable } from "roughjs/bin/core";
import { getFreehandStroke } from "@/lib/freehand";
import { drawRoughDrawable } from "@/lib/rough-draw";
import type {
  Annotation,
  CircleAnnotation,
  RectangleAnnotation,
  ArrowAnnotation,
  TextAnnotation,
  FreehandAnnotation,
  HighlighterAnnotation,
} from "@/types";

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

export function renderAnnotation(props: AnnotationRendererProps): React.ReactNode {
  const {
    annotation,
    activeTool,
    selectedIds,
    isTransformingAnnotation,
    getRoughDrawable,
    onAnnotationClick,
    onDragStart,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
    onTextDblClick,
    updateAnnotation,
    setIsTransformingAnnotation,
  } = props;

  const commonProps = {
    id: annotation.id,
    x: annotation.x,
    y: annotation.y,
    rotation: annotation.rotation ?? 0,
    scaleX: annotation.scaleX ?? 1,
    scaleY: annotation.scaleY ?? 1,
    draggable: activeTool === "select",
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onAnnotationClick(e, annotation),
    onDragStart: onDragStart,
    onDragEnd: onDragEnd,
    onTransformStart: onTransformStart,
    onTransformEnd: onTransformEnd,
  };

  switch (annotation.type) {
    case "circle":
      return renderCircle(annotation, commonProps, {
        isTransformingAnnotation,
        selectedIds,
        getRoughDrawable,
      });
    case "rectangle":
      return renderRectangle(annotation, commonProps, {
        isTransformingAnnotation,
        selectedIds,
        getRoughDrawable,
      });
    case "arrow":
      return renderArrow(annotation, commonProps, {
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
      });
    case "text":
      return renderText(annotation, commonProps, { onTextDblClick });
    case "freehand":
      return renderFreehand(annotation, commonProps, {
        activeTool,
        onAnnotationClick,
        onDragStart,
        onTransformStart,
        onTransformEnd,
        updateAnnotation,
        setIsTransformingAnnotation,
      });
    case "highlighter":
      return renderHighlighter(annotation, commonProps);
    default:
      return null;
  }
}

interface ShapeRenderContext {
  isTransformingAnnotation: boolean;
  selectedIds: string[];
  getRoughDrawable: (
    id: string,
    cacheKey: string,
    createDrawable: (gen: RoughGenerator) => Drawable,
  ) => Drawable;
}

function renderCircle(
  annotation: CircleAnnotation,
  commonProps: Record<string, unknown>,
  ctx: ShapeRenderContext,
) {
  const { isTransformingAnnotation, selectedIds, getRoughDrawable } = ctx;

  if (annotation.sketchiness) {
    const isBeingTransformed = isTransformingAnnotation && selectedIds.includes(annotation.id);
    const cacheKey = `${annotation.radius}-${annotation.stroke}-${annotation.strokeWidth}-${annotation.fill}-${annotation.sketchiness}`;
    const diameter = annotation.radius * 2;
    return (
      <Shape
        key={annotation.id}
        {...commonProps}
        width={diameter}
        height={diameter}
        offsetX={annotation.radius}
        offsetY={annotation.radius}
        strokeScaleEnabled={false}
        globalCompositeOperation={annotation.blendMode ?? "source-over"}
        sceneFunc={(ctx) => {
          if (isBeingTransformed) {
            ctx.beginPath();
            ctx.arc(annotation.radius, annotation.radius, annotation.radius, 0, Math.PI * 2);
            ctx.strokeStyle = annotation.stroke;
            ctx.lineWidth = annotation.strokeWidth;
            if (annotation.fill) {
              ctx.fillStyle = annotation.fill;
              ctx.fill();
            }
            ctx.stroke();
          } else {
            const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
              gen.ellipse(annotation.radius, annotation.radius, diameter, diameter, {
                stroke: annotation.stroke,
                strokeWidth: annotation.strokeWidth,
                fill: annotation.fill ?? undefined,
                fillStyle: annotation.fill ? "solid" : undefined,
                roughness: annotation.sketchiness,
                bowing: annotation.sketchiness,
              }),
            );
            drawRoughDrawable(ctx._context, drawable);
          }
        }}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.arc(annotation.radius, annotation.radius, annotation.radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
      />
    );
  }

  return (
    <Circle
      key={annotation.id}
      {...commonProps}
      radius={annotation.radius}
      stroke={annotation.stroke}
      strokeWidth={annotation.strokeWidth}
      strokeScaleEnabled={false}
      fill={annotation.fill ?? undefined}
      globalCompositeOperation={annotation.blendMode ?? "source-over"}
    />
  );
}

function renderRectangle(
  annotation: RectangleAnnotation,
  commonProps: Record<string, unknown>,
  ctx: ShapeRenderContext,
) {
  const { isTransformingAnnotation, selectedIds, getRoughDrawable } = ctx;

  if (annotation.sketchiness) {
    const isBeingTransformed = isTransformingAnnotation && selectedIds.includes(annotation.id);
    const r = annotation.cornerRadius ?? 0;
    const cacheKey = `${annotation.width}-${annotation.height}-${annotation.stroke}-${annotation.strokeWidth}-${annotation.fill}-${annotation.sketchiness}-${r}`;
    return (
      <Shape
        key={annotation.id}
        {...commonProps}
        width={annotation.width}
        height={annotation.height}
        strokeScaleEnabled={false}
        globalCompositeOperation={annotation.blendMode ?? "source-over"}
        sceneFunc={(ctx) => {
          if (isBeingTransformed) {
            ctx.beginPath();
            if (r > 0) {
              ctx.roundRect(0, 0, annotation.width, annotation.height, r);
            } else {
              ctx.rect(0, 0, annotation.width, annotation.height);
            }
            ctx.strokeStyle = annotation.stroke;
            ctx.lineWidth = annotation.strokeWidth;
            if (annotation.fill) {
              ctx.fillStyle = annotation.fill;
              ctx.fill();
            }
            ctx.stroke();
          } else {
            const w = annotation.width;
            const h = annotation.height;
            const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) => {
              if (r > 0) {
                const clampedR = Math.min(r, w / 2, h / 2);
                const path = `M ${clampedR},0 L ${w - clampedR},0 Q ${w},0 ${w},${clampedR} L ${w},${h - clampedR} Q ${w},${h} ${w - clampedR},${h} L ${clampedR},${h} Q 0,${h} 0,${h - clampedR} L 0,${clampedR} Q 0,0 ${clampedR},0 Z`;
                return gen.path(path, {
                  stroke: annotation.stroke,
                  strokeWidth: annotation.strokeWidth,
                  fill: annotation.fill ?? undefined,
                  fillStyle: annotation.fill ? "solid" : undefined,
                  roughness: annotation.sketchiness,
                  bowing: annotation.sketchiness,
                });
              }
              return gen.rectangle(0, 0, w, h, {
                stroke: annotation.stroke,
                strokeWidth: annotation.strokeWidth,
                fill: annotation.fill ?? undefined,
                fillStyle: annotation.fill ? "solid" : undefined,
                roughness: annotation.sketchiness,
                bowing: annotation.sketchiness,
              });
            });
            drawRoughDrawable(ctx._context, drawable);
          }
        }}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          if (r > 0) {
            ctx.roundRect(0, 0, annotation.width, annotation.height, r);
          } else {
            ctx.rect(0, 0, annotation.width, annotation.height);
          }
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
      />
    );
  }

  return (
    <Rect
      key={annotation.id}
      {...commonProps}
      width={annotation.width}
      height={annotation.height}
      stroke={annotation.stroke}
      strokeWidth={annotation.strokeWidth}
      strokeScaleEnabled={false}
      fill={annotation.fill ?? undefined}
      cornerRadius={annotation.cornerRadius}
      globalCompositeOperation={annotation.blendMode ?? "source-over"}
    />
  );
}

interface ArrowRenderContext extends ShapeRenderContext {
  activeTool: string;
  onAnnotationClick: (e: Konva.KonvaEventObject<MouseEvent>, annotation: Annotation) => void;
  onDragStart: () => void;
  onTransformStart: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  setIsTransformingAnnotation: (value: boolean) => void;
}

function renderArrow(
  annotation: ArrowAnnotation,
  _commonProps: Record<string, unknown>,
  ctx: ArrowRenderContext,
) {
  const {
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

  if (annotation.sketchiness && !isBeingTransformed) {
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
                strokeWidth: annotation.strokeWidth,
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
              strokeWidth: annotation.strokeWidth,
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

interface TextRenderContext {
  onTextDblClick: (annotation: TextAnnotation) => void;
}

function renderText(
  annotation: TextAnnotation,
  commonProps: Record<string, unknown>,
  ctx: TextRenderContext,
) {
  return (
    <Text
      key={annotation.id}
      {...commonProps}
      text={annotation.text}
      fontSize={annotation.fontSize}
      fontFamily={annotation.fontFamily}
      fill={annotation.fill}
      stroke={annotation.stroke ?? undefined}
      strokeWidth={annotation.strokeWidth}
      width={annotation.width}
      align={annotation.align}
      onDblClick={() => ctx.onTextDblClick(annotation)}
    />
  );
}

interface FreehandRenderContext {
  activeTool: string;
  onAnnotationClick: (e: Konva.KonvaEventObject<MouseEvent>, annotation: Annotation) => void;
  onDragStart: () => void;
  onTransformStart: () => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  setIsTransformingAnnotation: (value: boolean) => void;
}

function renderFreehand(
  annotation: FreehandAnnotation,
  _commonProps: Record<string, unknown>,
  ctx: FreehandRenderContext,
) {
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

function renderHighlighter(
  annotation: HighlighterAnnotation,
  commonProps: Record<string, unknown>,
) {
  return (
    <Line
      key={annotation.id}
      {...commonProps}
      points={annotation.points}
      stroke={annotation.stroke}
      strokeWidth={annotation.strokeWidth}
      tension={annotation.tension}
      opacity={annotation.opacity}
      lineCap="butt"
      lineJoin="miter"
      globalCompositeOperation="multiply"
    />
  );
}
