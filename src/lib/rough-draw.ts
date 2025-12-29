import type { Drawable, OpSet, ResolvedOptions } from "roughjs/bin/core";

/**
 * Draw functions adapted from rough.js source to work with Konva's context.
 * @see https://github.com/rough-stuff/rough/blob/master/src/canvas.ts
 */

function drawToContext(
  ctx: CanvasRenderingContext2D,
  drawing: OpSet,
  rule: CanvasFillRule = "nonzero",
) {
  ctx.beginPath();
  for (const item of drawing.ops) {
    const data = item.data;
    switch (item.op) {
      case "move":
        ctx.moveTo(data[0], data[1]);
        break;
      case "bcurveTo":
        ctx.bezierCurveTo(data[0], data[1], data[2], data[3], data[4], data[5]);
        break;
      case "lineTo":
        ctx.lineTo(data[0], data[1]);
        break;
    }
  }
  if (drawing.type === "fillPath") {
    ctx.fill(rule);
  } else {
    ctx.stroke();
  }
}

function fillSketch(ctx: CanvasRenderingContext2D, drawing: OpSet, o: ResolvedOptions) {
  let fweight = o.fillWeight;
  if (fweight < 0) {
    fweight = o.strokeWidth / 2;
  }
  ctx.save();
  if (o.fillLineDash) {
    ctx.setLineDash(o.fillLineDash);
  }
  if (o.fillLineDashOffset) {
    ctx.lineDashOffset = o.fillLineDashOffset;
  }
  ctx.strokeStyle = o.fill || "";
  ctx.lineWidth = fweight;
  drawToContext(ctx, drawing);
  ctx.restore();
}

export function drawRoughDrawable(ctx: CanvasRenderingContext2D, drawable: Drawable) {
  const sets = drawable.sets || [];
  const o = drawable.options;

  for (const drawing of sets) {
    switch (drawing.type) {
      case "path":
        ctx.save();
        ctx.strokeStyle = o.stroke === "none" ? "transparent" : (o.stroke ?? "");
        ctx.lineWidth = o.strokeWidth;
        if (o.strokeLineDash) {
          ctx.setLineDash(o.strokeLineDash);
        }
        if (o.strokeLineDashOffset) {
          ctx.lineDashOffset = o.strokeLineDashOffset;
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        drawToContext(ctx, drawing);
        ctx.restore();
        break;
      case "fillPath": {
        ctx.save();
        ctx.fillStyle = o.fill || "";
        const fillRule: CanvasFillRule =
          drawable.shape === "curve" || drawable.shape === "polygon" ? "evenodd" : "nonzero";
        drawToContext(ctx, drawing, fillRule);
        ctx.restore();
        break;
      }
      case "fillSketch":
        fillSketch(ctx, drawing, o);
        break;
    }
  }
}
