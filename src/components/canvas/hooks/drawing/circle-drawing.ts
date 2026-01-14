import type { CircleAnnotation } from "@/types";

interface DrawingParams {
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  defaultSketchiness: number;
}

export function createCircleAnnotation(
  id: string,
  pos: { x: number; y: number },
  params: DrawingParams
): CircleAnnotation {
  return {
    id,
    type: "circle",
    x: pos.x,
    y: pos.y,
    radiusX: 0,
    radiusY: 0,
    stroke: params.strokeColor,
    strokeWidth: params.strokeWidth,
    fill: params.fillColor,
    sketchiness: params.defaultSketchiness,
  };
}

export function updateCircleAnnotation(
  _annotation: CircleAnnotation,
  pos: { x: number; y: number },
  startPos: { x: number; y: number },
  shiftKey: boolean,
  altKey: boolean
): Partial<CircleAnnotation> {
  let dx = pos.x - startPos.x;
  let dy = pos.y - startPos.y;

  if (shiftKey) {
    const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
    dx = maxDim * Math.sign(dx || 1);
    dy = maxDim * Math.sign(dy || 1);
  }

  if (altKey) {
    return {
      x: startPos.x,
      y: startPos.y,
      radiusX: Math.abs(dx),
      radiusY: Math.abs(dy),
    };
  }

  return {
    x: startPos.x + dx / 2,
    y: startPos.y + dy / 2,
    radiusX: Math.abs(dx) / 2,
    radiusY: Math.abs(dy) / 2,
  };
}
