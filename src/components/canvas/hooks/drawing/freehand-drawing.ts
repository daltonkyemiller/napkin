import type { FreehandAnnotation } from "@/types";

interface DrawingParams {
  strokeColor: string;
  strokeWidth: number;
}

export function createFreehandAnnotation(
  id: string,
  pos: { x: number; y: number },
  params: DrawingParams
): FreehandAnnotation {
  return {
    id,
    type: "freehand",
    x: pos.x,
    y: pos.y,
    points: [[0, 0, 0.5]],
    stroke: params.strokeColor,
    strokeWidth: params.strokeWidth,
  };
}

export function updateFreehandAnnotation(
  annotation: FreehandAnnotation,
  pos: { x: number; y: number },
  pressure: number
): Partial<FreehandAnnotation> {
  const newPoints: [number, number, number][] = [
    ...annotation.points,
    [pos.x - annotation.x, pos.y - annotation.y, pressure],
  ];
  return { points: newPoints };
}
