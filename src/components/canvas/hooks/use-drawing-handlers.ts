import { useCallback, useRef, type RefObject } from "react";
import type Konva from "konva";
import { useAnnotationStore } from "@/stores/annotation-store";
import { simplifyPath } from "@/lib/path-smoothing";
import { ANNOTATION_CREATORS, ANNOTATION_UPDATERS } from "./drawing";
import type {
  Annotation,
  TextAnnotation,
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
  sketchiness: number;
  annotations: Annotation[];
  ocrSelectionStart: { x: number; y: number } | null;
  ocrSelectionRect: { x: number; y: number; width: number; height: number } | null;
  selectModeAfterDrawing: boolean;
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
  sketchiness,
  annotations,
  ocrSelectionStart,
  ocrSelectionRect,
  selectModeAfterDrawing,
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

        const drawingParams = {
          strokeColor,
          fillColor,
          strokeWidth,
          fontSize,
          sketchiness,
        };

        preDrawAnnotationsRef.current = [...useAnnotationStore.getState().annotations];
        useAnnotationStore.temporal.getState().pause();

        const creator = ANNOTATION_CREATORS[activeTool];
        if (creator) {
          const annotation = creator(id, imagePos, drawingParams);
          addAnnotation(annotation);

          if (activeTool === "text") {
            setSelectedId(id);
            setSelectedIds([id]);
            isDrawingRef.current = false;
            setIsDrawing(false);
            currentAnnotationRef.current = null;
            requestAnimationFrame(() => startInlineEdit(annotation as TextAnnotation));
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
      sketchiness,
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
      const pressure = (e.evt as PointerEvent).pressure || 0.5;
      const startPos = drawStartPosRef.current ?? { x: 0, y: 0 };

      const updater = ANNOTATION_UPDATERS[annotation.type];
      if (updater) {
        const updates = updater(annotation, pos, startPos, shiftKey, altKey, pressure);
        updateAnnotation(annotation.id, updates);
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

    if (shouldSwitchToSelect && selectModeAfterDrawing) {
      setActiveTool("select");
    }
  }, [
    activeTool,
    annotations,
    ocrSelectionStart,
    ocrSelectionRect,
    selectModeAfterDrawing,
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
