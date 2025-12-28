import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Image, Transformer, Rect, Circle, Arrow, Text, Line } from "react-konva";
import type Konva from "konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useInlineTextEditing } from "@/hooks/use-inline-text-editing";
import { simplifyPath, closePathIfNearStart } from "@/lib/path-smoothing";
import type {
  Annotation,
  CircleAnnotation,
  RectangleAnnotation,
  ArrowAnnotation,
  TextAnnotation,
  FreehandAnnotation,
} from "@/types";

interface AnnotationCanvasProps {
  image: HTMLImageElement;
}

export interface AnnotationCanvasHandle {
  exportImage: () => string | null;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas({ image }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const isDrawingRef = useRef(false);
    const currentAnnotationRef = useRef<string | null>(null);
    const preDrawHistoryLengthRef = useRef<number>(0);

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
    } = useCanvasStore();

    const { annotations, addAnnotation, updateAnnotation } = useAnnotationStore();
    const { startInlineEdit } = useInlineTextEditing(stageRef);

    const imageScale = Math.min(width / image.width, height / image.height, 1);
    const scaledWidth = image.width * imageScale;
    const scaledHeight = image.height * imageScale;
    const imageX = (width - scaledWidth) / 2;
    const imageY = (height - scaledHeight) / 2;

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

    const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      const clickedOnImage = e.target.className === "Image";
      const clickedOnAnnotation = !clickedOnEmpty && !clickedOnImage;

      if (activeTool === "select") {
        if (clickedOnEmpty || clickedOnImage) {
          clearSelection();
        }
        return;
      }

      if (clickedOnEmpty || clickedOnImage || clickedOnAnnotation) {
        const pos = stageRef.current?.getPointerPosition();
        if (!pos) return;

        clearSelection();
        isDrawingRef.current = true;
        setIsDrawing(true);

        const id = `annotation_${Date.now()}`;
        currentAnnotationRef.current = id;

        const baseProps = {
          id,
          x: pos.x,
          y: pos.y,
          stroke: strokeColor,
          strokeWidth,
        };

        preDrawHistoryLengthRef.current = useAnnotationStore.temporal.getState().pastStates.length;

        switch (activeTool) {
          case "circle": {
            const circleAnnotation: CircleAnnotation = {
              ...baseProps,
              type: "circle",
              radius: 0,
              fill: fillColor,
            };
            addAnnotation(circleAnnotation);
            break;
          }
          case "rectangle": {
            const rectAnnotation: RectangleAnnotation = {
              ...baseProps,
              type: "rectangle",
              width: 0,
              height: 0,
              fill: fillColor,
            };
            addAnnotation(rectAnnotation);
            break;
          }
          case "arrow": {
            const arrowAnnotation: ArrowAnnotation = {
              ...baseProps,
              type: "arrow",
              points: [0, 0, 0, 0],
              pointerLength: 15,
              pointerWidth: 15,
            };
            addAnnotation(arrowAnnotation);
            break;
          }
          case "text": {
            const textAnnotation: TextAnnotation = {
              id: baseProps.id,
              x: baseProps.x,
              y: baseProps.y,
              type: "text",
              text: "Text",
              fontSize,
              fontFamily: "Arial",
              fill: strokeColor,
              stroke: null,
              strokeWidth: 0,
            };
            addAnnotation(textAnnotation);
            setSelectedId(id);
            setSelectedIds([id]);
            isDrawingRef.current = false;
            setIsDrawing(false);
            currentAnnotationRef.current = null;
            break;
          }
          case "freehand": {
            const freehandAnnotation: FreehandAnnotation = {
              ...baseProps,
              type: "freehand",
              points: [0, 0],
              tension: 1,
            };
            addAnnotation(freehandAnnotation);
            break;
          }
        }
      }
    };

    const handleStageMouseMove = (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawingRef.current || !currentAnnotationRef.current) return;

      const pos = stageRef.current?.getPointerPosition();
      if (!pos) return;

      const annotation = annotations.find((a) => a.id === currentAnnotationRef.current);
      if (!annotation) return;

      switch (annotation.type) {
        case "circle": {
          const dx = pos.x - annotation.x;
          const dy = pos.y - annotation.y;
          const radius = Math.sqrt(dx * dx + dy * dy);
          updateAnnotation(annotation.id, { radius });
          break;
        }
        case "rectangle": {
          updateAnnotation(annotation.id, {
            width: pos.x - annotation.x,
            height: pos.y - annotation.y,
          });
          break;
        }
        case "arrow": {
          updateAnnotation(annotation.id, {
            points: [0, 0, pos.x - annotation.x, pos.y - annotation.y],
          });
          break;
        }
        case "freehand": {
          const newPoints = [
            ...(annotation as FreehandAnnotation).points,
            pos.x - annotation.x,
            pos.y - annotation.y,
          ];
          updateAnnotation(annotation.id, { points: newPoints });
          break;
        }
      }
    };

    const handleStageMouseUp = () => {
      if (isDrawingRef.current && currentAnnotationRef.current) {
        const annotation = annotations.find((a) => a.id === currentAnnotationRef.current);
        if (annotation) {
          if (annotation.type === "freehand") {
            const smoothed = simplifyPath((annotation as FreehandAnnotation).points);
            const { points: finalPoints } = closePathIfNearStart(smoothed);
            updateAnnotation(annotation.id, { points: finalPoints });
          }

          const temporal = useAnnotationStore.temporal.getState();
          const statesAddedDuringDraw =
            temporal.pastStates.length - preDrawHistoryLengthRef.current;
          if (statesAddedDuringDraw > 1) {
            const finalAnnotations = [...useAnnotationStore.getState().annotations];
            for (let i = 0; i < statesAddedDuringDraw; i++) {
              temporal.undo();
            }
            useAnnotationStore.getState().setAnnotations(finalAnnotations);
          }
        }
      }

      isDrawingRef.current = false;
      setIsDrawing(false);
      currentAnnotationRef.current = null;
    };

    const handleAnnotationClick = (
      e: Konva.KonvaEventObject<MouseEvent>,
      annotation: Annotation,
    ) => {
      if (activeTool !== "select") return;

      e.cancelBubble = true;
      const isShift = e.evt.shiftKey;

      if (isShift) {
        if (selectedIds.includes(annotation.id)) {
          const newSelection = selectedIds.filter((id) => id !== annotation.id);
          setSelectedIds(newSelection);
          setSelectedId(newSelection[newSelection.length - 1] ?? null);
        } else {
          setSelectedIds([...selectedIds, annotation.id]);
          setSelectedId(annotation.id);
        }
      } else {
        setSelectedId(annotation.id);
        setSelectedIds([annotation.id]);
      }
    };

    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const id = node.id();
      const annotation = annotations.find((a) => a.id === id);
      if (!annotation) return;

      updateAnnotation(id, {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      });
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateAnnotation(node.id(), {
        x: node.x(),
        y: node.y(),
      });
    };

    const renderAnnotation = (annotation: Annotation) => {
      const commonProps = {
        id: annotation.id,
        x: annotation.x,
        y: annotation.y,
        rotation: annotation.rotation ?? 0,
        scaleX: annotation.scaleX ?? 1,
        scaleY: annotation.scaleY ?? 1,
        draggable: activeTool === "select",
        onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleAnnotationClick(e, annotation),
        onDragEnd: handleDragEnd,
        onTransformEnd: handleTransformEnd,
      };

      switch (annotation.type) {
        case "circle":
          return (
            <Circle
              key={annotation.id}
              {...commonProps}
              radius={annotation.radius}
              stroke={annotation.stroke}
              strokeWidth={annotation.strokeWidth}
              fill={annotation.fill ?? undefined}
            />
          );
        case "rectangle":
          return (
            <Rect
              key={annotation.id}
              {...commonProps}
              width={annotation.width}
              height={annotation.height}
              stroke={annotation.stroke}
              strokeWidth={annotation.strokeWidth}
              fill={annotation.fill ?? undefined}
              cornerRadius={annotation.cornerRadius}
            />
          );
        case "arrow":
          return (
            <Arrow
              key={annotation.id}
              {...commonProps}
              points={annotation.points}
              stroke={annotation.stroke}
              strokeWidth={annotation.strokeWidth}
              fill={annotation.stroke}
              pointerLength={annotation.pointerLength}
              pointerWidth={annotation.pointerWidth}
            />
          );
        case "text":
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
              onDblClick={() => handleTextDblClick(annotation)}
            />
          );
        case "freehand":
          return (
            <Line
              key={annotation.id}
              {...commonProps}
              points={annotation.points}
              stroke={annotation.stroke}
              strokeWidth={annotation.strokeWidth}
              tension={annotation.tension}
              lineCap="round"
              lineJoin="round"
            />
          );
        default:
          return null;
      }
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
            {annotations.map(renderAnnotation)}
            {selectedId && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                anchorSize={10}
                borderStroke="#4F46E5"
                borderStrokeWidth={2}
                anchorStroke="#4F46E5"
                anchorStrokeWidth={2}
                anchorCornerRadius={2}
              />
            )}
          </Layer>
        </Stage>
      </div>
    );
  },
);
