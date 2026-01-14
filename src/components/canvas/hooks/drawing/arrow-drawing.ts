import type { ArrowAnnotation } from "@/types";

interface DrawingParams {
  strokeColor: string;
  strokeWidth: number;
  defaultSketchiness: number;
}

export function createArrowAnnotation(
  id: string,
  pos: { x: number; y: number },
  params: DrawingParams
): ArrowAnnotation {
  return {
    id,
    type: "arrow",
    x: pos.x,
    y: pos.y,
    points: [0, 0, 0, 0],
    stroke: params.strokeColor,
    strokeWidth: params.strokeWidth,
    pointerLength: 15,
    pointerWidth: 15,
    sketchiness: params.defaultSketchiness,
  };
}

export function updateArrowAnnotation(
  annotation: ArrowAnnotation,
  pos: { x: number; y: number }
): Partial<ArrowAnnotation> {
  return {
    points: [0, 0, pos.x - annotation.x, pos.y - annotation.y],
  };
}
