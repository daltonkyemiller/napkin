import type { HighlighterAnnotation } from "@/types";

interface DrawingParams {
  strokeColor: string;
}

export function createHighlighterAnnotation(
  id: string,
  pos: { x: number; y: number },
  params: DrawingParams
): HighlighterAnnotation {
  return {
    id,
    type: "highlighter",
    x: pos.x,
    y: pos.y,
    points: [0, 0],
    stroke: params.strokeColor,
    strokeWidth: 20,
    opacity: 0.4,
    tension: 0.5,
  };
}

export function updateHighlighterAnnotation(
  annotation: HighlighterAnnotation,
  pos: { x: number; y: number }
): Partial<HighlighterAnnotation> {
  const newPoints = [
    ...annotation.points,
    pos.x - annotation.x,
    pos.y - annotation.y,
  ];
  return { points: newPoints };
}
