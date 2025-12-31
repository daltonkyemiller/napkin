import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Stage, Layer, Image, Transformer, Rect, Group } from "react-konva";
import type Konva from "konva";
import rough from "roughjs";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable } from "roughjs/bin/core";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useInlineTextEditing } from "@/hooks/use-inline-text-editing";
import { simplifyPath } from "@/lib/path-smoothing";
import { stageToImageCoords, imageToStageCoords, type ImageTransform } from "@/lib/coordinates";
import { DEFAULT_FONT_FAMILY } from "@/constants";
import { renderAnnotation } from "./renderers";
import { ArrowHandles, CornerRadiusHandle } from "./selection-handles";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import type {
  Annotation,
  CircleAnnotation,
  RectangleAnnotation,
  ArrowAnnotation,
  TextAnnotation,
  FreehandAnnotation,
  HighlighterAnnotation,
} from "@/types";

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
    const isDrawingRef = useRef(false);
    const currentAnnotationRef = useRef<string | null>(null);
    const preDrawAnnotationsRef = useRef<Annotation[]>([]);
    const drawStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const [ocrSelectionStart, setOcrSelectionStart] = useState<{ x: number; y: number } | null>(
      null,
    );
    const [ocrSelectionRect, setOcrSelectionRect] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
    const [isTransformingAnnotation, setIsTransformingAnnotation] = useState(false);

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
    const { startInlineEdit } = useInlineTextEditing(stageRef);

    const roughGenerator = useMemo(() => rough.generator(), []);
    const roughDrawablesRef = useRef<Map<string, { key: string; drawable: Drawable }>>(new Map());

    const getRoughDrawable = useCallback(
      (
        id: string,
        cacheKey: string,
        createDrawable: (gen: RoughGenerator) => Drawable,
      ): Drawable => {
        const cached = roughDrawablesRef.current.get(id);
        if (cached && cached.key === cacheKey) {
          return cached.drawable;
        }
        const drawable = createDrawable(roughGenerator);
        roughDrawablesRef.current.set(id, { key: cacheKey, drawable });
        return drawable;
      },
      [roughGenerator],
    );

    const imageScale = Math.min(width / image.width, height / image.height, 1);
    const scaledWidth = image.width * imageScale;
    const scaledHeight = image.height * imageScale;
    const imageX = (width - scaledWidth) / 2;
    const imageY = (height - scaledHeight) / 2;

    const imageTransform: ImageTransform = useMemo(
      () => ({ imageX, imageY, imageScale }),
      [imageX, imageY, imageScale],
    );

    const getImageCoords = useCallback(
      (stageX: number, stageY: number) => stageToImageCoords(stageX, stageY, imageTransform),
      [imageTransform],
    );

    const getStageCoords = useCallback(
      (imageRelX: number, imageRelY: number) =>
        imageToStageCoords(imageRelX, imageRelY, imageTransform),
      [imageTransform],
    );

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

      if (activeTool === "ocr") {
        const pos = stageRef.current?.getPointerPosition();
        if (!pos) return;
        setOcrSelectionStart(pos);
        setOcrSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
        return;
      }

      if (clickedOnEmpty || clickedOnImage || clickedOnAnnotation) {
        const pos = stageRef.current?.getPointerPosition();
        if (!pos) return;

        const imagePos = getImageCoords(pos.x, pos.y);

        clearSelection();
        isDrawingRef.current = true;
        setIsDrawing(true);
        drawStartPosRef.current = imagePos;

        const id = `annotation_${Date.now()}`;
        currentAnnotationRef.current = id;

        const baseProps = {
          id,
          x: imagePos.x,
          y: imagePos.y,
          stroke: strokeColor,
          strokeWidth,
        };

        preDrawAnnotationsRef.current = [...useAnnotationStore.getState().annotations];
        useAnnotationStore.temporal.getState().pause();

        switch (activeTool) {
          case "circle": {
            const circleAnnotation: CircleAnnotation = {
              ...baseProps,
              type: "circle",
              radius: 0,
              fill: fillColor,
              sketchiness: defaultSketchiness,
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
              sketchiness: defaultSketchiness,
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
              sketchiness: defaultSketchiness,
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
              text: "",
              fontSize,
              fontFamily: DEFAULT_FONT_FAMILY,
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
            requestAnimationFrame(() => startInlineEdit(textAnnotation));
            break;
          }
          case "freehand": {
            const freehandAnnotation: FreehandAnnotation = {
              ...baseProps,
              type: "freehand",
              points: [[0, 0, 0.5]],
            };
            addAnnotation(freehandAnnotation);
            break;
          }
          case "highlighter": {
            const highlighterAnnotation: HighlighterAnnotation = {
              ...baseProps,
              type: "highlighter",
              points: [0, 0],
              strokeWidth: 20,
              opacity: 0.4,
              tension: 0.5,
            };
            addAnnotation(highlighterAnnotation);
            break;
          }
        }
      }
    };

    const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === "ocr" && ocrSelectionStart) {
        const pos = stageRef.current?.getPointerPosition();
        if (!pos) return;

        const x = Math.min(ocrSelectionStart.x, pos.x);
        const y = Math.min(ocrSelectionStart.y, pos.y);
        const rectWidth = Math.abs(pos.x - ocrSelectionStart.x);
        const rectHeight = Math.abs(pos.y - ocrSelectionStart.y);
        setOcrSelectionRect({ x, y, width: rectWidth, height: rectHeight });
        return;
      }

      if (!isDrawingRef.current || !currentAnnotationRef.current) return;

      const stagePos = stageRef.current?.getPointerPosition();
      if (!stagePos) return;

      const pos = getImageCoords(stagePos.x, stagePos.y);

      const annotation = annotations.find((a) => a.id === currentAnnotationRef.current);
      if (!annotation) return;

      const shiftKey = e.evt.shiftKey;
      const altKey = e.evt.altKey;

      switch (annotation.type) {
        case "circle": {
          const startPos = drawStartPosRef.current;
          if (!startPos) break;

          const dx = pos.x - startPos.x;
          const dy = pos.y - startPos.y;

          if (altKey) {
            const radius = Math.sqrt(dx * dx + dy * dy);
            updateAnnotation(annotation.id, { radius });
          } else {
            const radius = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
            const centerX = startPos.x + (Math.sign(dx) || 1) * radius;
            const centerY = startPos.y + (Math.sign(dy) || 1) * radius;
            updateAnnotation(annotation.id, {
              x: centerX,
              y: centerY,
              radius,
            });
          }
          break;
        }
        case "rectangle": {
          const startPos = drawStartPosRef.current;
          if (!startPos) break;

          let dx = pos.x - startPos.x;
          let dy = pos.y - startPos.y;

          if (shiftKey) {
            const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
            dx = maxDim * Math.sign(dx || 1);
            dy = maxDim * Math.sign(dy || 1);
          }

          if (altKey) {
            updateAnnotation(annotation.id, {
              x: startPos.x - dx,
              y: startPos.y - dy,
              width: dx * 2,
              height: dy * 2,
            });
          } else {
            updateAnnotation(annotation.id, {
              x: startPos.x,
              y: startPos.y,
              width: dx,
              height: dy,
            });
          }
          break;
        }
        case "arrow": {
          updateAnnotation(annotation.id, {
            points: [0, 0, pos.x - annotation.x, pos.y - annotation.y],
          });
          break;
        }
        case "freehand": {
          const pressure = (e.evt as PointerEvent).pressure || 0.5;
          const newPoints: [number, number, number][] = [
            ...(annotation as FreehandAnnotation).points,
            [pos.x - annotation.x, pos.y - annotation.y, pressure],
          ];
          updateAnnotation(annotation.id, { points: newPoints });
          break;
        }
        case "highlighter": {
          const newPoints = [
            ...(annotation as HighlighterAnnotation).points,
            pos.x - annotation.x,
            pos.y - annotation.y,
          ];
          updateAnnotation(annotation.id, { points: newPoints });
          break;
        }
      }
    };

    const handleStageMouseUp = () => {
      if (activeTool === "ocr" && ocrSelectionStart && ocrSelectionRect) {
        if (ocrSelectionRect.width > 10 && ocrSelectionRect.height > 10 && onOcrRegionSelected) {
          const tempCanvas = document.createElement("canvas");
          const ctx = tempCanvas.getContext("2d");
          if (ctx && stageRef.current) {
            const scaleX = image.width / scaledWidth;
            const scaleY = image.height / scaledHeight;

            const sourceX = (ocrSelectionRect.x - imageX) * scaleX;
            const sourceY = (ocrSelectionRect.y - imageY) * scaleY;
            const sourceWidth = ocrSelectionRect.width * scaleX;
            const sourceHeight = ocrSelectionRect.height * scaleY;

            tempCanvas.width = sourceWidth;
            tempCanvas.height = sourceHeight;

            ctx.drawImage(
              image,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight,
              0,
              0,
              sourceWidth,
              sourceHeight,
            );

            const imageData = tempCanvas.toDataURL("image/png");
            onOcrRegionSelected(
              imageData,
              ocrSelectionRect.x,
              ocrSelectionRect.y,
              ocrSelectionRect.width,
              ocrSelectionRect.height,
            );
          }
        }
        setOcrSelectionStart(null);
        setOcrSelectionRect(null);
        return;
      }

      if (isDrawingRef.current && currentAnnotationRef.current) {
        const annotation = annotations.find((a) => a.id === currentAnnotationRef.current);
        if (annotation) {
          if (annotation.type === "highlighter") {
            const smoothed = simplifyPath((annotation as HighlighterAnnotation).points);
            updateAnnotation(annotation.id, { points: smoothed });
          }

          const finalAnnotations = [...useAnnotationStore.getState().annotations];

          useAnnotationStore.setState({ annotations: preDrawAnnotationsRef.current });
          useAnnotationStore.temporal.getState().resume();
          useAnnotationStore.setState({ annotations: finalAnnotations });
        }
      }

      const shouldSwitchToSelect =
        currentAnnotationRef.current !== null &&
        (activeTool === "circle" || activeTool === "rectangle" || activeTool === "arrow");

      isDrawingRef.current = false;
      setIsDrawing(false);
      currentAnnotationRef.current = null;
      drawStartPosRef.current = null;

      if (shouldSwitchToSelect) {
        setActiveTool("select");
      }
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

    const handleDragStart = () => {
      setIsTransformingAnnotation(true);
    };

    const handleTransformStart = () => {
      setIsTransformingAnnotation(true);
    };

    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const id = node.id();
      const annotation = annotations.find((a) => a.id === id);
      if (!annotation) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      if (annotation.type === "rectangle") {
        const rect = annotation as RectangleAnnotation;
        updateAnnotation(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: rect.width * scaleX,
          height: rect.height * scaleY,
          scaleX: 1,
          scaleY: 1,
        });
        node.scaleX(1);
        node.scaleY(1);
      } else if (annotation.type === "circle") {
        const circle = annotation as CircleAnnotation;
        const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        updateAnnotation(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          radius: circle.radius * avgScale,
          scaleX: 1,
          scaleY: 1,
        });
        node.scaleX(1);
        node.scaleY(1);
      } else {
        updateAnnotation(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: scaleX,
          scaleY: scaleY,
        });
      }
      setIsTransformingAnnotation(false);
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateAnnotation(node.id(), {
        x: node.x(),
        y: node.y(),
      });
      setIsTransformingAnnotation(false);
    };

    const selectedRectangle = useMemo(() => {
      if (selectedIds.length !== 1) return null;
      const annotation = annotations.find((a) => a.id === selectedIds[0]);
      if (annotation?.type !== "rectangle") return null;
      return annotation as RectangleAnnotation;
    }, [selectedIds, annotations]);

    const selectedArrow = useMemo(() => {
      if (selectedIds.length !== 1) return null;
      const annotation = annotations.find((a) => a.id === selectedIds[0]);
      if (annotation?.type !== "arrow") return null;
      return annotation as ArrowAnnotation;
    }, [selectedIds, annotations]);

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
