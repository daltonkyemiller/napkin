import { DEFAULT_FONT_FAMILY } from "@/constants";
import type { TextAnnotation } from "@/types";

interface TextDrawingParams {
  strokeColor: string;
  fontSize: number;
}

export function createTextAnnotation(
  id: string,
  pos: { x: number; y: number },
  params: TextDrawingParams
): TextAnnotation {
  return {
    id,
    type: "text",
    x: pos.x,
    y: pos.y,
    text: "",
    fontSize: params.fontSize,
    fontFamily: DEFAULT_FONT_FAMILY,
    fill: params.strokeColor,
    stroke: null,
    strokeWidth: 0,
  };
}
