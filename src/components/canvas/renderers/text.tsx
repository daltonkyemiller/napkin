import { Text } from "react-konva";
import type { TextAnnotation } from "@/types";
import type { CommonProps } from "./types";

interface TextRenderContext {
  onTextDblClick: (annotation: TextAnnotation) => void;
}

export function renderText(
  annotation: TextAnnotation,
  commonProps: CommonProps,
  ctx: TextRenderContext,
) {
  return (
    <Text
      key={annotation.id}
      {...commonProps}
      text={annotation.text}
      fontSize={annotation.fontSize}
      fontFamily={annotation.fontFamily}
      fill={annotation.fill}
      stroke={annotation.stroke ?? undefined}
      strokeWidth={annotation.strokeWidth}
      width={annotation.width}
      align={annotation.align}
      onDblClick={() => ctx.onTextDblClick(annotation)}
    />
  );
}
