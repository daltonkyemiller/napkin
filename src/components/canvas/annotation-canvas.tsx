import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Image, Transformer, Rect, Group } from "react-konva";
import type Konva from "konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useInlineTextEditing } from "@/hooks/use-inline-text-editing";
import { renderAnnotation } from "./renderers";
import { ArrowHandles, CornerRadiusHandle } from "./selection-handles";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useRoughGenerator } from "./hooks/use-rough-generator";
import { useImageTransform } from "./hooks/use-image-transform";
import { useAnnotationInteraction } from "./hooks/use-annotation-interaction";
import { useOcrSelection } from "./hooks/use-ocr-selection";
import { useDrawingHandlers } from "./hooks/use-drawing-handlers";
import type { TextAnnotation } from "@/types";

interface AnnotationCanvasProps {
  image: HTMLImageElement;
  onOcrRegionSelected?: (
    imageData: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
}

export interface AnnotationCanvasHandle {
  exportImage: () => string | null;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas({ image, onOcrRegionSelected }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    const {
      width,
      height,
      selectedId,
      selectedIds,
      activeTool,
      strokeColor,
      fillColor,
      strokeWidth,
      fontSize,
      setSelectedId,
      setSelectedIds,
      clearSelection,
      setIsDrawing,
      setCanvasSize,
      setActiveTool,
    } = useCanvasStore();

    const { annotations, addAnnotation, updateAnnotation } = useAnnotationStore();
    const { sketchiness: defaultSketchiness } = useSettingsStore();
    const { getRoughDrawable } = useRoughGenerator();
    const {
      imageScale,
      scaledWidth,
      scaledHeight,
      imageX,
      imageY,
      getImageCoords,
      getStageCoords,
    } = useImageTransform({ image, canvasWidth: width, canvasHeight: height });
    const { startInlineEdit } = useInlineTextEditing(stageRef, imageScale);
    const {
      isTransformingAnnotation,
      setIsTransformingAnnotation,
      handleAnnotationClick,
      handleDragStart,
      handleDragEnd,
      handleTransformStart,
      handleTransformEnd,
      selectedRectangle,
      selectedArrow,
    } = useAnnotationInteraction({
      annotations,
      activeTool,
      selectedIds,
      setSelectedId,
      setSelectedIds,
      updateAnnotation,
    });
    const {
      ocrSelectionRect,
      ocrSelectionStart,
      handleOcrMouseDown,
      handleOcrMouseMove,
      handleOcrMouseUp,
    } = useOcrSelection({
      stageRef,
      image,
      scaledWidth,
      scaledHeight,
      imageX,
      imageY,
      onOcrRegionSelected,
    });
    const {
      handleStageMouseDown,
      handleStageMouseMove,
      handleStageMouseUp,
    } = useDrawingHandlers({
      stageRef,
      activeTool,
      strokeColor,
      fillColor,
      strokeWidth,
      fontSize,
      defaultSketchiness,
      annotations,
      ocrSelectionStart,
      ocrSelectionRect,
      getImageCoords,
      clearSelection,
      setIsDrawing,
      setActiveTool,
      setSelectedId,
      setSelectedIds,
      addAnnotation,
      updateAnnotation,
      handleOcrMouseDown,
      handleOcrMouseMove,
      handleOcrMouseUp,
      startInlineEdit,
    });

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setCanvasSize(entry.contentRect.width, entry.contentRect.height);
        }
      });

      resizeObserver.observe(container);
      setCanvasSize(container.offsetWidth, container.offsetHeight);

      return () => resizeObserver.disconnect();
    }, [setCanvasSize]);

    useEffect(() => {
      if (!transformerRef.current || !stageRef.current) return;

      if (selectedIds.length > 0) {
        const selectedNodes = selectedIds
          .map((id) => stageRef.current?.findOne(`#${id}`))
          .filter((node): node is Konva.Node => node != null);

        transformerRef.current.nodes(selectedNodes);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }, [selectedIds]);

    useKeyboardShortcuts({
      annotations,
      selectedIds,
      setSelectedId,
      setSelectedIds,
      addAnnotation,
    });

    useImperativeHandle(
      ref,
      () => ({
        exportImage: () => {
          if (!stageRef.current) return null;

          transformerRef.current?.nodes([]);
          stageRef.current.batchDraw();

          const dataURL = stageRef.current.toDataURL({
            x: imageX,
            y: imageY,
            width: scaledWidth,
            height: scaledHeight,
            pixelRatio: image.width / scaledWidth,
          });

          return dataURL;
        },
      }),
      [imageX, imageY, scaledWidth, scaledHeight, image.width],
    );

    const handleTextDblClick = (annotation: TextAnnotation) => {
      startInlineEdit(annotation);
    };

    return (
      <div ref={containerRef} className="h-full w-full">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
        >
          <Layer>
            <Image image={image} x={imageX} y={imageY} width={scaledWidth} height={scaledHeight} />
            <Group x={imageX} y={imageY} scaleX={imageScale} scaleY={imageScale}>
              {annotations.map((annotation) =>
                renderAnnotation({
                  annotation,
                  activeTool,
                  selectedIds,
                  isTransformingAnnotation,
                  getRoughDrawable,
                  onAnnotationClick: handleAnnotationClick,
                  onDragStart: handleDragStart,
                  onDragEnd: handleDragEnd,
                  onTransformStart: handleTransformStart,
                  onTransformEnd: handleTransformEnd,
                  onTextDblClick: handleTextDblClick,
                  updateAnnotation,
                  setIsTransformingAnnotation,
                }),
              )}
            </Group>
            {selectedId && !selectedArrow && (
              <Transformer
                ref={transformerRef}
                keepRatio={false}
                rotateEnabled={true}
                rotateAnchorOffset={30}
                anchorSize={10}
                borderStroke="#4F46E5"
                borderStrokeWidth={2}
                anchorStroke="#4F46E5"
                anchorStrokeWidth={2}
                anchorCornerRadius={2}
              />
            )}
            {ocrSelectionRect && (
              <Rect
                x={ocrSelectionRect.x}
                y={ocrSelectionRect.y}
                width={ocrSelectionRect.width}
                height={ocrSelectionRect.height}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[6, 3]}
                fill="rgba(59, 130, 246, 0.1)"
              />
            )}
            {selectedRectangle && activeTool === "select" && !isTransformingAnnotation && (
              <CornerRadiusHandle
                rectangle={selectedRectangle}
                getStageCoords={getStageCoords}
                getImageCoords={getImageCoords}
                updateAnnotation={updateAnnotation}
              />
            )}
            {selectedArrow && activeTool === "select" && !isTransformingAnnotation && (
              <ArrowHandles
                arrow={selectedArrow}
                getStageCoords={getStageCoords}
                getImageCoords={getImageCoords}
                updateAnnotation={updateAnnotation}
              />
            )}
          </Layer>
        </Stage>
      </div>
    );
  },
);
