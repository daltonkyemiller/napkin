import { Ellipse, Shape } from "react-konva";
import { drawRoughDrawable } from "@/lib/rough-draw";
import type { CircleAnnotation } from "@/types";
import type { CommonProps, ShapeRenderContext } from "./types";

export function renderCircle(
  annotation: CircleAnnotation,
  commonProps: CommonProps,
  ctx: ShapeRenderContext,
) {
  const { isTransformingAnnotation, selectedIds, getRoughDrawable } = ctx;
  const { radiusX, radiusY } = annotation;
  const width = radiusX * 2;
  const height = radiusY * 2;

  if (annotation.sketchiness) {
    const isBeingTransformed = isTransformingAnnotation && selectedIds.includes(annotation.id);
    const cacheKey = `${radiusX}-${radiusY}-${annotation.stroke}-${annotation.strokeWidth}-${annotation.fill}-${annotation.sketchiness}`;
    return (
      <Shape
        key={annotation.id}
        {...commonProps}
        width={width}
        height={height}
        offsetX={radiusX}
        offsetY={radiusY}
        strokeScaleEnabled={false}
        globalCompositeOperation={annotation.blendMode ?? "source-over"}
        sceneFunc={(ctx) => {
          if (isBeingTransformed) {
            ctx.beginPath();
            ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = annotation.stroke;
            ctx.lineWidth = annotation.strokeWidth;
            if (annotation.fill) {
              ctx.fillStyle = annotation.fill;
              ctx.fill();
            }
            ctx.stroke();
          } else {
            const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
              gen.ellipse(radiusX, radiusY, width, height, {
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
          ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
      />
    );
  }

  return (
    <Ellipse
      key={annotation.id}
      {...commonProps}
      radiusX={radiusX}
      radiusY={radiusY}
      stroke={annotation.stroke}
      strokeWidth={annotation.strokeWidth}
      strokeScaleEnabled={false}
      fill={annotation.fill ?? undefined}
      globalCompositeOperation={annotation.blendMode ?? "source-over"}
    />
  );
}
