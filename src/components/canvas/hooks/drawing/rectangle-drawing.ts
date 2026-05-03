import type { RectangleAnnotation } from "@/types";

interface DrawingParams {
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  sketchiness: number;
}

export function createRectangleAnnotation(
  id: string,
  pos: { x: number; y: number },
  params: DrawingParams,
): RectangleAnnotation {
  return {
    id,
    type: "rectangle",
    x: pos.x,
    y: pos.y,
    width: 0,
    height: 0,
    stroke: params.strokeColor,
    strokeWidth: params.strokeWidth,
    fill: params.fillColor,
    sketchiness: params.sketchiness,
  };
}

export function updateRectangleAnnotation(
  _annotation: RectangleAnnotation,
  pos: { x: number; y: number },
  startPos: { x: number; y: number },
  shiftKey: boolean,
  altKey: boolean,
): Partial<RectangleAnnotation> {
  let dx = pos.x - startPos.x;
  let dy = pos.y - startPos.y;

  if (shiftKey) {
    const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
    dx = maxDim * Math.sign(dx || 1);
    dy = maxDim * Math.sign(dy || 1);
  }

  if (altKey) {
    return {
      x: startPos.x - dx,
      y: startPos.y - dy,
      width: dx * 2,
      height: dy * 2,
    };
  }

  return {
    x: startPos.x,
    y: startPos.y,
    width: dx,
    height: dy,
  };
}
