import { Text } from "react-konva";
import type { TextAnnotation } from "@/types";
import type { CommonProps } from "./types";

interface TextRenderContext {
  onTextDblClick: (annotation: TextAnnotation) => void;
  onTextTransform: (e: any) => void;
  onTextTransformEnd: (annotation: TextAnnotation, e: any) => void;
}

export function renderText(
  annotation: TextAnnotation,
  commonProps: CommonProps,
  ctx: TextRenderContext,
) {
  const { scaleX: _scaleX, scaleY: _scaleY, ...restCommonProps } = commonProps;

  return (
    <Text
      key={annotation.id}
      {...restCommonProps}
      scaleX={1}
      scaleY={1}
      text={annotation.text}
      fontSize={annotation.fontSize}
      fontFamily={annotation.fontFamily}
      fill={annotation.fill}
      stroke={annotation.stroke ?? undefined}
      strokeWidth={annotation.strokeWidth}
      width={annotation.width || 200}
      wrap="word"
      align={annotation.align}
      onDblClick={() => ctx.onTextDblClick(annotation)}
      onTransform={ctx.onTextTransform}
      onTransformEnd={(e) => ctx.onTextTransformEnd(annotation, e)}
    />
  );
}
