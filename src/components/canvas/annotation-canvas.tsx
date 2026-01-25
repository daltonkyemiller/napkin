import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Image, Transformer, Rect, Group } from "react-konva";
import Konva from "konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useBackgroundStore, GRADIENT_PRESETS } from "@/stores/background-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useInlineTextEditing } from "@/hooks/use-inline-text-editing";
import { parseGradient } from "@/lib/gradient-parser";
import { renderAnnotation } from "./renderers";
import { ArrowHandles, CornerRadiusHandle } from "./selection-handles";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useRoughGenerator } from "./hooks/use-rough-generator";
import { useAnnotationInteraction } from "./hooks/use-annotation-interaction";
import { useOcrSelection } from "./hooks/use-ocr-selection";
import { useDrawingHandlers } from "./hooks/use-drawing-handlers";
import { useCanvasLayout } from "./hooks/use-canvas-layout";
import { usePanZoom } from "./hooks/use-pan-zoom";
import { useCanvasExport } from "./hooks/use-canvas-export";
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
  exportImage: (format?: "png" | "jpg") => string | null;
  exportImageData: () => ImageData | null;
  exportForClipboard: () => Promise<Blob | null>;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas({ image, onOcrRegionSelected }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const bgImageRef = useRef<Konva.Image>(null);
    const [bgImageElement, setBgImageElement] = useState<HTMLImageElement | null>(null);

    const {
      width: containerWidth,
      height: containerHeight,
      selectedId,
      selectedIds,
      activeTool,
      zoomLevel,
      setZoomLevel,
      panOffset,
      setPanOffset,
      strokeColor,
      fillColor,
      strokeWidth,
      sketchiness,
      fontSize,
      isDrawing,
      setSelectedId,
      setSelectedIds,
      clearSelection,
      setIsDrawing,
      setCanvasSize,
      setActiveTool,
    } = useCanvasStore();

    const { annotations, addAnnotation, updateAnnotation } = useAnnotationStore();
    const { selectModeAfterDrawing } = useSettingsStore();
    const {
      backgroundType,
      gradientPreset,
      customImage,
      padding,
      borderRadius,
      shadowSize,
      shadowColor,
      aspectRatio,
      blur,
      imageHasTransparency,
    } = useBackgroundStore();
    const { getRoughDrawable } = useRoughGenerator();

    const hasBackground = backgroundType !== "none";

    const backgroundValue = useMemo(() => {
      if (backgroundType === "none") return null;
      if (backgroundType === "image" && customImage) return customImage;
      if (backgroundType === "gradient") {
        const preset = GRADIENT_PRESETS.find((p) => p.id === gradientPreset);
        return preset?.value || null;
      }
      return null;
    }, [backgroundType, customImage, gradientPreset]);

    useEffect(() => {
      if (backgroundType === "image" && customImage) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setBgImageElement(img);
        };
        img.src = customImage;
      } else {
        setBgImageElement(null);
      }
    }, [backgroundType, customImage]);

    useEffect(() => {
      if (bgImageRef.current && blur > 0 && bgImageElement) {
        bgImageRef.current.cache();
        bgImageRef.current.filters([Konva.Filters.Blur]);
        bgImageRef.current.blurRadius(blur);
      } else if (bgImageRef.current) {
        bgImageRef.current.clearCache();
        bgImageRef.current.filters([]);
      }
    }, [blur, bgImageElement]);

    const layout = useCanvasLayout({
      image: { width: image.width, height: image.height },
      containerWidth,
      containerHeight,
      padding,
      aspectRatio,
      hasBackground,
      bgImageElement,
      zoomLevel,
      panOffset,
    });

    const gradientConfig = useMemo(() => {
      if (backgroundType !== "gradient" || !backgroundValue) return null;
      return parseGradient(backgroundValue, layout.bgWidth, layout.bgHeight);
    }, [backgroundType, backgroundValue, layout.bgWidth, layout.bgHeight]);

    const getImageCoords = (stageX: number, stageY: number) => {
      const x = (stageX - layout.stageX) / layout.scale - layout.imageOffsetX;
      const y = (stageY - layout.stageY) / layout.scale - layout.imageOffsetY;
      return { x, y };
    };

    const getStageCoords = (imageX: number, imageY: number) => {
      const x = (imageX + layout.imageOffsetX) * layout.scale + layout.stageX;
      const y = (imageY + layout.imageOffsetY) * layout.scale + layout.stageY;
      return { x, y };
    };

    const { startInlineEdit } = useInlineTextEditing(stageRef, layout.scale);
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
      scaledWidth: image.width * layout.scale,
      scaledHeight: image.height * layout.scale,
      imageX: layout.stageX + layout.imageOffsetX * layout.scale,
      imageY: layout.stageY + layout.imageOffsetY * layout.scale,
      onOcrRegionSelected,
    });

    const { handleStageMouseDown, handleStageMouseMove, handleStageMouseUp } = useDrawingHandlers({
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

    const {
      isSpaceHeld,
      isPanning,
      handlePanMouseDown,
      handlePanMouseMove,
      handlePanMouseUp,
    } = usePanZoom({ stageRef, panOffset, setPanOffset });

    const wrappedMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (handlePanMouseDown()) return;
      handleStageMouseDown(e);
    };

    const wrappedMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (handlePanMouseMove()) return;
      handleStageMouseMove(e);
    };

    const wrappedMouseUp = () => {
      if (handlePanMouseUp()) return;
      handleStageMouseUp();
    };

    const canvasExport = useCanvasExport({
      stageRef,
      transformerRef,
      layout,
      image: { width: image.width, height: image.height },
      hasBackground,
    });

    useImperativeHandle(ref, () => canvasExport, [canvasExport]);

    const handleTextDblClick = (annotation: TextAnnotation) => {
      startInlineEdit(annotation);
    };

    const handleTextTransform = (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      node.setAttrs({
        width: Math.max(node.width() * node.scaleX(), 30),
        scaleX: 1,
        scaleY: 1,
      });
    };

    const handleTextTransformEnd = (
      annotation: TextAnnotation,
      e: Konva.KonvaEventObject<Event>,
    ) => {
      const node = e.target;
      updateAnnotation(annotation.id, {
        width: node.width(),
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      });
    };

    const selectedText =
      selectedIds.length === 1
        ? (annotations.find((a) => a.id === selectedIds[0] && a.type === "text") as
            | TextAnnotation
            | undefined)
        : undefined;

    const scaledBorderRadius = borderRadius * layout.scale;

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      if (!e.evt.ctrlKey) return;

      e.evt.preventDefault();
      
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.1;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newZoom = direction > 0 ? zoomLevel * scaleBy : zoomLevel / scaleBy;
      const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
      
      const zoomRatio = clampedZoom / zoomLevel;
      
      const centerX = containerWidth / 2 + panOffset.x;
      const centerY = containerHeight / 2 + panOffset.y;
      
      const newPanX = pointer.x - (pointer.x - centerX) * zoomRatio - containerWidth / 2;
      const newPanY = pointer.y - (pointer.y - centerY) * zoomRatio - containerHeight / 2;

      setPanOffset({ x: newPanX, y: newPanY });
      setZoomLevel(clampedZoom);
    };

    useEffect(() => {
      const container = stageRef.current?.container();
      if (!container) return;
      if (isSpaceHeld) {
        container.style.cursor = isPanning ? "grabbing" : "grab";
      } else {
        container.style.cursor = "";
      }
    }, [isSpaceHeld, isPanning]);

    return (
      <div ref={containerRef} className="h-full w-full">
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={containerHeight}
          onMouseDown={wrappedMouseDown}
          onMouseMove={wrappedMouseMove}
          onMouseUp={wrappedMouseUp}
          onMouseLeave={wrappedMouseUp}
          onWheel={handleWheel}
        >
          <Layer imageSmoothingEnabled={false}>
            {hasBackground && (
              <Group
                x={layout.stageX}
                y={layout.stageY}
                scaleX={layout.scale}
                scaleY={layout.scale}
              >
                {backgroundType === "gradient" && gradientConfig && (
                  <Rect
                    width={layout.bgWidth}
                    height={layout.bgHeight}
                    fillLinearGradientStartPoint={gradientConfig.startPoint}
                    fillLinearGradientEndPoint={gradientConfig.endPoint}
                    fillLinearGradientColorStops={gradientConfig.colorStops}
                  />
                )}
                {backgroundType === "image" && bgImageElement && (
                  <Group
                    clipFunc={(ctx) => {
                      ctx.beginPath();
                      ctx.rect(0, 0, layout.bgWidth, layout.bgHeight);
                      ctx.closePath();
                    }}
                  >
                    <Image
                      ref={bgImageRef}
                      image={bgImageElement}
                      x={layout.bgImageX}
                      y={layout.bgImageY}
                      scaleX={layout.bgImageScale}
                      scaleY={layout.bgImageScale}
                    />
                  </Group>
                )}
              </Group>
            )}

            {hasBackground && shadowSize > 0 && !imageHasTransparency && (
              <Rect
                x={layout.stageX + layout.imageOffsetX * layout.scale + 1}
                y={layout.stageY + layout.imageOffsetY * layout.scale + 1}
                width={image.width * layout.scale - 2}
                height={image.height * layout.scale - 2}
                cornerRadius={Math.max(0, scaledBorderRadius - 1)}
                fill="#fff"
                shadowColor={shadowColor}
                shadowBlur={shadowSize * layout.scale}
                shadowOffsetY={shadowSize * layout.scale * 0.3}
                shadowEnabled={true}
              />
            )}

            <Group
              x={layout.stageX + layout.imageOffsetX * layout.scale}
              y={layout.stageY + layout.imageOffsetY * layout.scale}
              clipFunc={
                hasBackground
                  ? (ctx) => {
                      ctx.beginPath();
                      ctx.roundRect(
                        0,
                        0,
                        image.width * layout.scale,
                        image.height * layout.scale,
                        scaledBorderRadius,
                      );
                      ctx.closePath();
                    }
                  : undefined
              }
            >
              <Image
                image={image}
                width={image.width}
                height={image.height}
                scaleX={layout.scale}
                scaleY={layout.scale}
              />
              <Group scaleX={layout.scale} scaleY={layout.scale}>
                {annotations.map((annotation) =>
                  renderAnnotation({
                    annotation,
                    activeTool,
                    selectedIds,
                    isDrawing,
                    isTransformingAnnotation,
                    getRoughDrawable,
                    onAnnotationClick: handleAnnotationClick,
                    onDragStart: handleDragStart,
                    onDragEnd: handleDragEnd,
                    onTransformStart: handleTransformStart,
                    onTransformEnd: handleTransformEnd,
                    onTextDblClick: handleTextDblClick,
                    onTextTransform: handleTextTransform,
                    onTextTransformEnd: handleTextTransformEnd,
                    updateAnnotation,
                    setIsTransformingAnnotation,
                  }),
                )}
              </Group>
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
                enabledAnchors={
                  selectedText
                    ? ["middle-left", "middle-right"]
                    : [
                        "top-left",
                        "top-center",
                        "top-right",
                        "middle-right",
                        "bottom-right",
                        "bottom-center",
                        "bottom-left",
                        "middle-left",
                      ]
                }
                boundBoxFunc={
                  selectedText
                    ? (_oldBox, newBox) => {
                        newBox.width = Math.max(30, newBox.width);
                        return newBox;
                      }
                    : undefined
                }
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
