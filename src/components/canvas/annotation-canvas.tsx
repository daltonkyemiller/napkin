import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo, useCallback } from "react";
import { Stage, Layer, Image, Transformer, Rect, Circle, Text, Line, Shape } from "react-konva";
import type Konva from "konva";
import rough from "roughjs";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable } from "roughjs/bin/core";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useInlineTextEditing } from "@/hooks/use-inline-text-editing";
import { simplifyPath, closePathIfNearStart } from "@/lib/path-smoothing";
import { drawRoughDrawable } from "@/lib/rough-draw";
import type {
  Annotation,
  CircleAnnotation,
  RectangleAnnotation,
  ArrowAnnotation,
  TextAnnotation,
  FreehandAnnotation,
  HighlighterAnnotation,
} from "@/types";

const ROUGHNESS = 1;
const BOWING = 1;

interface AnnotationCanvasProps {
  image: HTMLImageElement;
  onOcrRegionSelected?: (imageData: string, x: number, y: number, width: number, height: number) => void;
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
    const preDrawHistoryLengthRef = useRef<number>(0);
    const drawStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const [ocrSelectionStart, setOcrSelectionStart] = useState<{ x: number; y: number } | null>(null);
    const [ocrSelectionRect, setOcrSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
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
    } = useCanvasStore();

    const { annotations, addAnnotation, updateAnnotation } = useAnnotationStore();
    const { startInlineEdit } = useInlineTextEditing(stageRef);

    const roughGenerator = useMemo(() => rough.generator(), []);
    const roughDrawablesRef = useRef<Map<string, { key: string; drawable: Drawable }>>(new Map());

    const getRoughDrawable = useCallback(
      (id: string, cacheKey: string, createDrawable: (gen: RoughGenerator) => Drawable): Drawable => {
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

        clearSelection();
        isDrawingRef.current = true;
        setIsDrawing(true);
        drawStartPosRef.current = pos;

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
              text: "",
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
            requestAnimationFrame(() => startInlineEdit(textAnnotation));
            break;
          }
          case "freehand": {
            const freehandAnnotation: FreehandAnnotation = {
              ...baseProps,
              type: "freehand",
              points: [0, 0],
              tension: 0.4,
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
        const width = Math.abs(pos.x - ocrSelectionStart.x);
        const height = Math.abs(pos.y - ocrSelectionStart.y);
        setOcrSelectionRect({ x, y, width, height });
        return;
      }

      if (!isDrawingRef.current || !currentAnnotationRef.current) return;

      const pos = stageRef.current?.getPointerPosition();
      if (!pos) return;

      const annotation = annotations.find((a) => a.id === currentAnnotationRef.current);
      if (!annotation) return;

      const shiftKey = e.evt.shiftKey;
      const altKey = e.evt.altKey;

      switch (annotation.type) {
        case "circle": {
          const dx = pos.x - annotation.x;
          const dy = pos.y - annotation.y;
          const radius = Math.sqrt(dx * dx + dy * dy);
          updateAnnotation(annotation.id, { radius });
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
          const newPoints = [
            ...(annotation as FreehandAnnotation).points,
            pos.x - annotation.x,
            pos.y - annotation.y,
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
              sourceX, sourceY, sourceWidth, sourceHeight,
              0, 0, sourceWidth, sourceHeight
            );
            
            const imageData = tempCanvas.toDataURL("image/png");
            onOcrRegionSelected(
              imageData,
              ocrSelectionRect.x,
              ocrSelectionRect.y,
              ocrSelectionRect.width,
              ocrSelectionRect.height
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
          if (annotation.type === "freehand") {
            const smoothed = simplifyPath((annotation as FreehandAnnotation).points);
            const { points: finalPoints } = closePathIfNearStart(smoothed);
            updateAnnotation(annotation.id, { points: finalPoints });
          } else if (annotation.type === "highlighter") {
            const smoothed = simplifyPath((annotation as HighlighterAnnotation).points);
            updateAnnotation(annotation.id, { points: smoothed });
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
      drawStartPosRef.current = null;
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

    const getArrowCurveMidpoint = (arrow: ArrowAnnotation) => {
      const [startX, startY, endX, endY] = arrow.points;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      const bend = arrow.bend ?? 0;
      if (bend === 0) {
        return { x: midX, y: midY };
      }
      
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return { x: midX, y: midY };
      
      const perpX = -dy / length;
      const perpY = dx / length;
      
      return {
        x: midX + perpX * bend * 0.5,
        y: midY + perpY * bend * 0.5,
      };
    };

    const handleArrowStartDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!selectedArrow) return;
      const node = e.target;
      const [, , endX, endY] = selectedArrow.points;
      const newStartX = node.x() - selectedArrow.x;
      const newStartY = node.y() - selectedArrow.y;
      updateAnnotation(selectedArrow.id, {
        points: [newStartX, newStartY, endX, endY],
      });
    };

    const handleArrowEndDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!selectedArrow) return;
      const node = e.target;
      const [startX, startY] = selectedArrow.points;
      const newEndX = node.x() - selectedArrow.x;
      const newEndY = node.y() - selectedArrow.y;
      updateAnnotation(selectedArrow.id, {
        points: [startX, startY, newEndX, newEndY],
      });
    };

    const handleArrowMidDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!selectedArrow) return;
      const node = e.target;
      const [startX, startY, endX, endY] = selectedArrow.points;
      
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return;
      
      const perpX = -dy / length;
      const perpY = dx / length;
      
      const handleX = node.x() - selectedArrow.x;
      const handleY = node.y() - selectedArrow.y;
      
      const offsetX = handleX - midX;
      const offsetY = handleY - midY;
      const bend = (offsetX * perpX + offsetY * perpY) * 2;
      
      updateAnnotation(selectedArrow.id, { bend });
    };

    const rotatePoint = (x: number, y: number, angleDeg: number) => {
      const radians = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
      };
    };

    const CORNER_RADIUS_HANDLE_OFFSET = 16;

    const getCornerRadiusHandlePosition = (rect: RectangleAnnotation) => {
      const cornerRadius = rect.cornerRadius ?? 0;
      const scaleX = rect.scaleX ?? 1;
      const scaleY = rect.scaleY ?? 1;
      const rotation = rect.rotation ?? 0;
      const signX = Math.sign(rect.width) || 1;
      const signY = Math.sign(rect.height) || 1;
      
      const offset = cornerRadius + CORNER_RADIUS_HANDLE_OFFSET;
      const scaledX = offset * scaleX * signX;
      const scaledY = offset * scaleY * signY;
      
      const rotated = rotatePoint(scaledX, scaledY, rotation);
      
      return {
        x: rect.x + rotated.x,
        y: rect.y + rotated.y,
      };
    };

    const cornerRadiusDragBoundFunc = (pos: { x: number; y: number }) => {
      if (!selectedRectangle) return pos;
      
      const rotation = selectedRectangle.rotation ?? 0;
      const scaleX = selectedRectangle.scaleX ?? 1;
      const scaleY = selectedRectangle.scaleY ?? 1;
      const signX = Math.sign(selectedRectangle.width) || 1;
      const signY = Math.sign(selectedRectangle.height) || 1;
      
      const dx = pos.x - selectedRectangle.x;
      const dy = pos.y - selectedRectangle.y;
      
      const unrotated = rotatePoint(dx, dy, -rotation);
      const localX = (unrotated.x / scaleX) * signX;
      const localY = (unrotated.y / scaleY) * signY;
      
      const maxRadius = Math.min(
        Math.abs(selectedRectangle.width),
        Math.abs(selectedRectangle.height)
      ) / 2;
      
      const diagonalPos = (localX + localY) / 2;
      const minOffset = CORNER_RADIUS_HANDLE_OFFSET;
      const maxOffset = maxRadius + CORNER_RADIUS_HANDLE_OFFSET;
      const clampedOffset = Math.max(minOffset, Math.min(diagonalPos, maxOffset));
      
      const rotated = rotatePoint(clampedOffset * scaleX * signX, clampedOffset * scaleY * signY, rotation);
      
      return {
        x: selectedRectangle.x + rotated.x,
        y: selectedRectangle.y + rotated.y,
      };
    };

    const handleCornerRadiusDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!selectedRectangle) return;
      
      const node = e.target;
      const rotation = selectedRectangle.rotation ?? 0;
      const scaleX = selectedRectangle.scaleX ?? 1;
      const signX = Math.sign(selectedRectangle.width) || 1;
      
      const dx = node.x() - selectedRectangle.x;
      const dy = node.y() - selectedRectangle.y;
      
      const unrotated = rotatePoint(dx, dy, -rotation);
      const localOffset = (unrotated.x / scaleX) * signX;
      const localRadius = localOffset - CORNER_RADIUS_HANDLE_OFFSET;
      
      const maxRadius = Math.min(
        Math.abs(selectedRectangle.width),
        Math.abs(selectedRectangle.height)
      ) / 2;
      const clampedRadius = Math.max(0, Math.min(localRadius, maxRadius));
      
      updateAnnotation(selectedRectangle.id, { cornerRadius: Math.round(clampedRadius) });
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
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
        onTransformStart: handleTransformStart,
        onTransformEnd: handleTransformEnd,
      };

      switch (annotation.type) {
        case "circle": {
          if (annotation.sketchy) {
            const isBeingTransformed = isTransformingAnnotation && selectedIds.includes(annotation.id);
            const cacheKey = `${annotation.radius}-${annotation.stroke}-${annotation.strokeWidth}-${annotation.fill}`;
            const diameter = annotation.radius * 2;
            return (
              <Shape
                key={annotation.id}
                {...commonProps}
                width={diameter}
                height={diameter}
                offsetX={annotation.radius}
                offsetY={annotation.radius}
                strokeScaleEnabled={false}
                sceneFunc={(ctx) => {
                  if (isBeingTransformed) {
                    ctx.beginPath();
                    ctx.arc(annotation.radius, annotation.radius, annotation.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = annotation.stroke;
                    ctx.lineWidth = annotation.strokeWidth;
                    if (annotation.fill) {
                      ctx.fillStyle = annotation.fill;
                      ctx.fill();
                    }
                    ctx.stroke();
                  } else {
                    const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
                      gen.ellipse(annotation.radius, annotation.radius, diameter, diameter, {
                        stroke: annotation.stroke,
                        strokeWidth: annotation.strokeWidth,
                        fill: annotation.fill ?? undefined,
                        fillStyle: annotation.fill ? "solid" : undefined,
                        roughness: ROUGHNESS,
                        bowing: BOWING,
                      }),
                    );
                    drawRoughDrawable(ctx._context, drawable);
                  }
                }}
                hitFunc={(ctx, shape) => {
                  ctx.beginPath();
                  ctx.arc(annotation.radius, annotation.radius, annotation.radius, 0, Math.PI * 2);
                  ctx.closePath();
                  ctx.fillStrokeShape(shape);
                }}
              />
            );
          }
          return (
            <Circle
              key={annotation.id}
              {...commonProps}
              radius={annotation.radius}
              stroke={annotation.stroke}
              strokeWidth={annotation.strokeWidth}
              strokeScaleEnabled={false}
              fill={annotation.fill ?? undefined}
            />
          );
        }
        case "rectangle": {
          if (annotation.sketchy) {
            const isBeingTransformed = isTransformingAnnotation && selectedIds.includes(annotation.id);
            const cacheKey = `${annotation.width}-${annotation.height}-${annotation.stroke}-${annotation.strokeWidth}-${annotation.fill}`;
            return (
              <Shape
                key={annotation.id}
                {...commonProps}
                width={annotation.width}
                height={annotation.height}
                strokeScaleEnabled={false}
                sceneFunc={(ctx) => {
                  if (isBeingTransformed) {
                    ctx.beginPath();
                    ctx.rect(0, 0, annotation.width, annotation.height);
                    ctx.strokeStyle = annotation.stroke;
                    ctx.lineWidth = annotation.strokeWidth;
                    if (annotation.fill) {
                      ctx.fillStyle = annotation.fill;
                      ctx.fill();
                    }
                    ctx.stroke();
                  } else {
                    const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
                      gen.rectangle(0, 0, annotation.width, annotation.height, {
                        stroke: annotation.stroke,
                        strokeWidth: annotation.strokeWidth,
                        fill: annotation.fill ?? undefined,
                        fillStyle: annotation.fill ? "solid" : undefined,
                        roughness: ROUGHNESS,
                        bowing: BOWING,
                      }),
                    );
                    drawRoughDrawable(ctx._context, drawable);
                  }
                }}
                hitFunc={(ctx, shape) => {
                  ctx.beginPath();
                  ctx.rect(0, 0, annotation.width, annotation.height);
                  ctx.closePath();
                  ctx.fillStrokeShape(shape);
                }}
              />
            );
          }
          return (
            <Rect
              key={annotation.id}
              {...commonProps}
              width={annotation.width}
              height={annotation.height}
              stroke={annotation.stroke}
              strokeWidth={annotation.strokeWidth}
              strokeScaleEnabled={false}
              fill={annotation.fill ?? undefined}
              cornerRadius={annotation.cornerRadius}
            />
          );
        }
        case "arrow": {
          const [startX, startY, endX, endY] = annotation.points;
          const bend = annotation.bend ?? 0;
          const basePointerLength = annotation.pointerLength ?? 10;
          const basePointerWidth = annotation.pointerWidth ?? 10;
          const pointerLength = basePointerLength + annotation.strokeWidth;
          const pointerWidth = basePointerWidth + annotation.strokeWidth;
          const isBeingTransformed = isTransformingAnnotation && selectedIds.includes(annotation.id);

          if (annotation.sketchy && !isBeingTransformed) {
            const cacheKey = `${startX}-${startY}-${endX}-${endY}-${bend}-${annotation.stroke}-${annotation.strokeWidth}`;
            
            if (bend !== 0) {
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const dx = endX - startX;
              const dy = endY - startY;
              const length = Math.sqrt(dx * dx + dy * dy) || 1;
              const perpX = -dy / length;
              const perpY = dx / length;
              const ctrlX = midX + perpX * bend;
              const ctrlY = midY + perpY * bend;
              
              const tangentX = endX - ctrlX;
              const tangentY = endY - ctrlY;
              const angle = Math.atan2(tangentY, tangentX);
              
              return (
                <Shape
                  key={annotation.id}
                  {...commonProps}
                  stroke={annotation.stroke}
                  strokeWidth={Math.max(annotation.strokeWidth, 15)}
                  sceneFunc={(ctx) => {
                    const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
                      gen.path(`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`, {
                        stroke: annotation.stroke,
                        strokeWidth: annotation.strokeWidth,
                        roughness: ROUGHNESS,
                        bowing: BOWING,
                      }),
                    );
                    drawRoughDrawable(ctx._context, drawable);
                    
                    ctx.save();
                    ctx.translate(endX, endY);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(-pointerLength, -pointerWidth / 2);
                    ctx.lineTo(0, 0);
                    ctx.lineTo(-pointerLength, pointerWidth / 2);
                    ctx.strokeStyle = annotation.stroke;
                    ctx.lineWidth = annotation.strokeWidth;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.stroke();
                    ctx.restore();
                  }}
                  hitFunc={(ctx, shape) => {
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
                    ctx.fillStrokeShape(shape);
                  }}
                />
              );
            }
            
            const straightAngle = Math.atan2(endY - startY, endX - startX);
            
            return (
              <Shape
                key={annotation.id}
                {...commonProps}
                stroke={annotation.stroke}
                strokeWidth={Math.max(annotation.strokeWidth, 15)}
                sceneFunc={(ctx) => {
                  const drawable = getRoughDrawable(annotation.id, cacheKey, (gen) =>
                    gen.line(startX, startY, endX, endY, {
                      stroke: annotation.stroke,
                      strokeWidth: annotation.strokeWidth,
                      roughness: ROUGHNESS,
                      bowing: BOWING,
                    }),
                  );
                  drawRoughDrawable(ctx._context, drawable);
                  
                  ctx.save();
                  ctx.translate(endX, endY);
                  ctx.rotate(straightAngle);
                  ctx.beginPath();
                  ctx.moveTo(-pointerLength, -pointerWidth / 2);
                  ctx.lineTo(0, 0);
                  ctx.lineTo(-pointerLength, pointerWidth / 2);
                  ctx.strokeStyle = annotation.stroke;
                  ctx.lineWidth = annotation.strokeWidth;
                  ctx.lineCap = "round";
                  ctx.lineJoin = "round";
                  ctx.stroke();
                  ctx.restore();
                }}
                hitFunc={(ctx, shape) => {
                  ctx.beginPath();
                  ctx.moveTo(startX, startY);
                  ctx.lineTo(endX, endY);
                  ctx.fillStrokeShape(shape);
                }}
              />
            );
          }

          if (bend !== 0) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const dx = endX - startX;
            const dy = endY - startY;
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = -dy / length;
            const perpY = dx / length;
            const ctrlX = midX + perpX * bend;
            const ctrlY = midY + perpY * bend;
            
            const tangentX = endX - ctrlX;
            const tangentY = endY - ctrlY;
            const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
            const normTangentX = tangentX / tangentLen;
            const normTangentY = tangentY / tangentLen;
            const angle = Math.atan2(tangentY, tangentX);
            
            const shortenBy = annotation.strokeWidth / 2;
            const shortenedEndX = endX - normTangentX * shortenBy;
            const shortenedEndY = endY - normTangentY * shortenBy;
          
            return (
              <Shape
                key={annotation.id}
                {...commonProps}
                stroke={annotation.stroke}
                strokeWidth={Math.max(annotation.strokeWidth, 15)}
                sceneFunc={(ctx) => {
                  ctx.save();
                  
                  ctx.beginPath();
                  ctx.moveTo(startX, startY);
                  ctx.quadraticCurveTo(ctrlX, ctrlY, shortenedEndX, shortenedEndY);
                  ctx.strokeStyle = annotation.stroke;
                  ctx.lineWidth = annotation.strokeWidth;
                  ctx.lineCap = "butt";
                  ctx.lineJoin = "round";
                  ctx.stroke();

                  ctx.translate(endX, endY);
                  ctx.rotate(angle);
                  ctx.beginPath();
                  ctx.moveTo(-pointerLength, -pointerWidth / 2);
                  ctx.lineTo(0, 0);
                  ctx.lineTo(-pointerLength, pointerWidth / 2);
                  ctx.strokeStyle = annotation.stroke;
                  ctx.lineWidth = annotation.strokeWidth;
                  ctx.lineCap = "round";
                  ctx.lineJoin = "round";
                  ctx.stroke();
                  
                  ctx.restore();
                }}
                hitFunc={(ctx, shape) => {
                  ctx.beginPath();
                  ctx.moveTo(startX, startY);
                  ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
                  ctx.fillStrokeShape(shape);
                }}
              />
            );
          }

          const straightDx = endX - startX;
          const straightDy = endY - startY;
          const straightLen = Math.sqrt(straightDx * straightDx + straightDy * straightDy) || 1;
          const straightAngle = Math.atan2(straightDy, straightDx);
          const straightShortenBy = annotation.strokeWidth / 2;
          const straightEndX = endX - (straightDx / straightLen) * straightShortenBy;
          const straightEndY = endY - (straightDy / straightLen) * straightShortenBy;

          return (
            <Shape
              key={annotation.id}
              {...commonProps}
              stroke={annotation.stroke}
              strokeWidth={Math.max(annotation.strokeWidth, 15)}
              sceneFunc={(ctx) => {
                ctx.save();
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(straightEndX, straightEndY);
                ctx.strokeStyle = annotation.stroke;
                ctx.lineWidth = annotation.strokeWidth;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.stroke();

                ctx.translate(endX, endY);
                ctx.rotate(straightAngle);
                ctx.beginPath();
                ctx.moveTo(-pointerLength, -pointerWidth / 2);
                ctx.lineTo(0, 0);
                ctx.lineTo(-pointerLength, pointerWidth / 2);
                ctx.strokeStyle = annotation.stroke;
                ctx.lineWidth = annotation.strokeWidth;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.stroke();
                
                ctx.restore();
              }}
              hitFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.fillStrokeShape(shape);
              }}
            />
          );
        }
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
        case "highlighter":
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
            {selectedId && !selectedArrow && (
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
            {selectedRectangle && activeTool === "select" && !isTransformingAnnotation && (() => {
              const pos = getCornerRadiusHandlePosition(selectedRectangle);
              return (
                <Circle
                  x={pos.x}
                  y={pos.y}
                  radius={6}
                  fill="#4F46E5"
                  stroke="#fff"
                  strokeWidth={2}
                  draggable
                  dragBoundFunc={cornerRadiusDragBoundFunc}
                  onDragMove={handleCornerRadiusDrag}
                  hitStrokeWidth={10}
                />
              );
            })()}
            {selectedArrow && activeTool === "select" && !isTransformingAnnotation && (() => {
              const [startX, startY, endX, endY] = selectedArrow.points;
              const mid = getArrowCurveMidpoint(selectedArrow);
              return (
                <>
                  <Circle
                    x={selectedArrow.x + startX}
                    y={selectedArrow.y + startY}
                    radius={6}
                    fill="#4F46E5"
                    stroke="#fff"
                    strokeWidth={2}
                    draggable
                    onDragMove={handleArrowStartDrag}
                    hitStrokeWidth={10}
                  />
                  <Circle
                    x={selectedArrow.x + mid.x}
                    y={selectedArrow.y + mid.y}
                    radius={6}
                    fill="#10b981"
                    stroke="#fff"
                    strokeWidth={2}
                    draggable
                    onDragMove={handleArrowMidDrag}
                    hitStrokeWidth={10}
                  />
                  <Circle
                    x={selectedArrow.x + endX}
                    y={selectedArrow.y + endY}
                    radius={6}
                    fill="#4F46E5"
                    stroke="#fff"
                    strokeWidth={2}
                    draggable
                    onDragMove={handleArrowEndDrag}
                    hitStrokeWidth={10}
                  />
                </>
              );
            })()}
          </Layer>
        </Stage>
      </div>
    );
  },
);
