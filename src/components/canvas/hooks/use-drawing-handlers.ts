import { useCallback, useRef, type RefObject } from "react";
import type Konva from "konva";
import { useAnnotationStore } from "@/stores/annotation-store";
import { simplifyPath } from "@/lib/path-smoothing";
import { DEFAULT_FONT_FAMILY } from "@/constants";
import type {
  Annotation,
  CircleAnnotation,
  RectangleAnnotation,
  ArrowAnnotation,
  TextAnnotation,
  FreehandAnnotation,
  HighlighterAnnotation,
  Tool,
} from "@/types";

interface UseDrawingHandlersParams {
  stageRef: RefObject<Konva.Stage | null>;
  activeTool: Tool;
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  fontSize: number;
  defaultSketchiness: number;
  annotations: Annotation[];
  ocrSelectionStart: { x: number; y: number } | null;
  ocrSelectionRect: { x: number; y: number; width: number; height: number } | null;
  getImageCoords: (stageX: number, stageY: number) => { x: number; y: number };
  clearSelection: () => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setActiveTool: (tool: Tool) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  handleOcrMouseDown: () => boolean;
  handleOcrMouseMove: () => boolean;
  handleOcrMouseUp: () => boolean;
  startInlineEdit: (annotation: TextAnnotation) => void;
}

export function useDrawingHandlers({
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
}: UseDrawingHandlersParams) {
  const isDrawingRef = useRef(false);
  const currentAnnotationRef = useRef<string | null>(null);
  const preDrawAnnotationsRef = useRef<Annotation[]>([]);
  const drawStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
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
        handleOcrMouseDown();
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
              radiusX: 0,
              radiusY: 0,
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
    },
    [
      stageRef,
      activeTool,
      strokeColor,
      fillColor,
      strokeWidth,
      fontSize,
      defaultSketchiness,
      getImageCoords,
      clearSelection,
      setIsDrawing,
      setSelectedId,
      setSelectedIds,
      addAnnotation,
      handleOcrMouseDown,
      startInlineEdit,
    ],
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === "ocr" && ocrSelectionStart) {
        handleOcrMouseMove();
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

          let dx = pos.x - startPos.x;
          let dy = pos.y - startPos.y;

          if (shiftKey) {
            const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
            dx = maxDim * Math.sign(dx || 1);
            dy = maxDim * Math.sign(dy || 1);
          }

          if (altKey) {
            updateAnnotation(annotation.id, {
              x: startPos.x,
              y: startPos.y,
              radiusX: Math.abs(dx),
              radiusY: Math.abs(dy),
            });
          } else {
            updateAnnotation(annotation.id, {
              x: startPos.x + dx / 2,
              y: startPos.y + dy / 2,
              radiusX: Math.abs(dx) / 2,
              radiusY: Math.abs(dy) / 2,
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
    },
    [
      stageRef,
      activeTool,
      annotations,
      ocrSelectionStart,
      getImageCoords,
      updateAnnotation,
      handleOcrMouseMove,
    ],
  );

  const handleStageMouseUp = useCallback(() => {
    if (activeTool === "ocr" && ocrSelectionStart && ocrSelectionRect) {
      handleOcrMouseUp();
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
  }, [
    activeTool,
    annotations,
    ocrSelectionStart,
    ocrSelectionRect,
    setIsDrawing,
    setActiveTool,
    updateAnnotation,
    handleOcrMouseUp,
  ]);

  return {
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
  };
}
