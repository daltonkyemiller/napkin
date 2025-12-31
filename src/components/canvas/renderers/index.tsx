import { renderCircle } from "./circle";
import { renderRectangle } from "./rectangle";
import { renderArrow } from "./arrow";
import { renderText } from "./text";
import { renderFreehand } from "./freehand";
import { renderHighlighter } from "./highlighter";
import { buildCommonProps, type AnnotationRendererProps } from "./types";

export type { AnnotationRendererProps } from "./types";

export function renderAnnotation(props: AnnotationRendererProps): React.ReactNode {
  const {
    annotation,
    activeTool,
    selectedIds,
    isTransformingAnnotation,
    getRoughDrawable,
    onAnnotationClick,
    onDragStart,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
    onTextDblClick,
    onTextTransform,
    onTextTransformEnd,
    updateAnnotation,
    setIsTransformingAnnotation,
  } = props;

  const commonProps = buildCommonProps(
    annotation,
    activeTool,
    onAnnotationClick,
    onDragStart,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
  );

  const shapeCtx = {
    isTransformingAnnotation,
    selectedIds,
    getRoughDrawable,
  };

  switch (annotation.type) {
    case "circle":
      return renderCircle(annotation, commonProps, shapeCtx);

    case "rectangle":
      return renderRectangle(annotation, commonProps, shapeCtx);

    case "arrow":
      return renderArrow(annotation, {
        ...shapeCtx,
        activeTool,
        onAnnotationClick,
        onDragStart,
        onTransformStart,
        onTransformEnd,
        updateAnnotation,
        setIsTransformingAnnotation,
      });

    case "text":
      return renderText(annotation, commonProps, {
        onTextDblClick,
        onTextTransform,
        onTextTransformEnd,
      });

    case "freehand":
      return renderFreehand(annotation, {
        activeTool,
        onAnnotationClick,
        onDragStart,
        onTransformStart,
        onTransformEnd,
        updateAnnotation,
        setIsTransformingAnnotation,
      });

    case "highlighter":
      return renderHighlighter(annotation, commonProps);

    default:
      return null;
  }
}
