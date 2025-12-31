import { Line } from "react-konva";
import type { HighlighterAnnotation } from "@/types";
import type { CommonProps } from "./types";

export function renderHighlighter(annotation: HighlighterAnnotation, commonProps: CommonProps) {
  return (
    <Line
      key={annotation.id}
      {...commonProps}
      points={annotation.points}
      stroke={annotation.stroke}
      strokeWidth={annotation.strokeWidth}
      tension={annotation.tension}
      opacity={annotation.opacity}
      lineCap="butt"
      lineJoin="miter"
      globalCompositeOperation="multiply"
    />
  );
}
