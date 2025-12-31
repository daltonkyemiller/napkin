import { Rect, Shape } from "react-konva";
import { drawRoughDrawable } from "@/lib/rough-draw";
import type { RectangleAnnotation } from "@/types";
import type { CommonProps, ShapeRenderContext } from "./types";

export function renderRectangle(
  annotation: RectangleAnnotation,
  commonProps: CommonProps,
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
