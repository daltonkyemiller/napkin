import { Circle, Shape } from "react-konva";
import { drawRoughDrawable } from "@/lib/rough-draw";
import type { CircleAnnotation } from "@/types";
import type { CommonProps, ShapeRenderContext } from "./types";

export function renderCircle(
  annotation: CircleAnnotation,
  commonProps: CommonProps,
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
