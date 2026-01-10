import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Image, Transformer, Rect, Group } from "react-konva";
import Konva from "konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useBackgroundStore, GRADIENT_PRESETS, ASPECT_RATIOS } from "@/stores/background-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useInlineTextEditing } from "@/hooks/use-inline-text-editing";
import { renderAnnotation } from "./renderers";
import { ArrowHandles, CornerRadiusHandle } from "./selection-handles";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useRoughGenerator } from "./hooks/use-rough-generator";
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
  exportImage: (format?: "png" | "jpg") => string | null;
  exportImageData: () => ImageData | null;
  exportForClipboard: () => Promise<Blob | null>;
}

function parseGradient(gradientStr: string, width: number, height: number) {
  const match = gradientStr.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
  if (!match) return null;

  const angle = parseInt(match[1]);
  const angleRad = (angle - 90) * (Math.PI / 180);

  const diagonal = Math.sqrt(width * width + height * height);
  const centerX = width / 2;
  const centerY = height / 2;

  const startX = centerX - (Math.cos(angleRad) * diagonal) / 2;
  const startY = centerY - (Math.sin(angleRad) * diagonal) / 2;
  const endX = centerX + (Math.cos(angleRad) * diagonal) / 2;
  const endY = centerY + (Math.sin(angleRad) * diagonal) / 2;

  const colorStops: (number | string)[] = [];
  const stops = match[2].split(/,(?![^(]*\))/);
  stops.forEach((stop: string) => {
    const colorMatch = stop.trim().match(/(.+?)\s+(\d+)%/);
    if (colorMatch) {
      colorStops.push(parseFloat(colorMatch[2]) / 100, colorMatch[1].trim());
    }
  });

  return {
    startPoint: { x: startX, y: startY },
    endPoint: { x: endX, y: endY },
    colorStops,
  };
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas({ image, onOcrRegionSelected }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const bgImageRef = useRef<Konva.Image>(null);
    const [bgImageElement, setBgImageElement] = useState<HTMLImageElement | null>(null);
    const [isSpaceHeld, setIsSpaceHeld] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

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
    const { sketchiness: defaultSketchiness, selectModeAfterDrawing } = useSettingsStore();
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

    const layout = useMemo(() => {
      const contentWidth = image.width + padding * 2;
      const contentHeight = image.height + padding * 2;

      let bgWidth = contentWidth;
      let bgHeight = contentHeight;

      if (hasBackground) {
        const ratioConfig = ASPECT_RATIOS.find((r) => r.id === aspectRatio);
        const targetRatio = ratioConfig?.value;
        if (targetRatio) {
          const currentRatio = contentWidth / contentHeight;
          if (currentRatio > targetRatio) {
            bgHeight = contentWidth / targetRatio;
          } else {
            bgWidth = contentHeight * targetRatio;
          }
        }
      }

      const totalWidth = hasBackground ? bgWidth : image.width;
      const totalHeight = hasBackground ? bgHeight : image.height;

      const fitScale = Math.min(containerWidth / totalWidth, containerHeight / totalHeight);
      const baseScale = Math.min(fitScale, 1);
      const scale = baseScale * zoomLevel;

      const scaledTotal = {
        width: totalWidth * scale,
        height: totalHeight * scale,
      };

      const stageX = (containerWidth - scaledTotal.width) / 2 + panOffset.x;
      const stageY = (containerHeight - scaledTotal.height) / 2 + panOffset.y;

      const imageOffsetX = hasBackground ? (bgWidth - image.width) / 2 : 0;
      const imageOffsetY = hasBackground ? (bgHeight - image.height) / 2 : 0;

      let bgImageScale = 1;
      let bgImageX = 0;
      let bgImageY = 0;

      if (bgImageElement) {
        const bgImgRatio = bgImageElement.width / bgImageElement.height;
        const targetRatio = bgWidth / bgHeight;

        if (bgImgRatio > targetRatio) {
          bgImageScale = bgHeight / bgImageElement.height;
          bgImageX = (bgWidth - bgImageElement.width * bgImageScale) / 2;
        } else {
          bgImageScale = bgWidth / bgImageElement.width;
          bgImageY = (bgHeight - bgImageElement.height * bgImageScale) / 2;
        }
      }

      return {
        scale,
        bgWidth,
        bgHeight,
        imageOffsetX,
        imageOffsetY,
        stageX,
        stageY,
        scaledWidth: scaledTotal.width,
        scaledHeight: scaledTotal.height,
        contentWidth,
        contentHeight,
        bgImageScale,
        bgImageX,
        bgImageY,
      };
    }, [
      image.width,
      image.height,
      padding,
      aspectRatio,
      hasBackground,
      containerWidth,
      containerHeight,
      bgImageElement,
      zoomLevel,
      panOffset,
    ]);

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
      defaultSketchiness,
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

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Space" && !e.repeat) {
          setIsSpaceHeld(true);
        }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          setIsSpaceHeld(false);
          setIsPanning(false);
          panStartRef.current = null;
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    const handlePanMouseDown = () => {
      if (!isSpaceHeld) return false;
      const pos = stageRef.current?.getPointerPosition();
      if (!pos) return false;
      setIsPanning(true);
      panStartRef.current = { x: pos.x, y: pos.y, panX: panOffset.x, panY: panOffset.y };
      return true;
    };

    const handlePanMouseMove = () => {
      if (!isPanning || !panStartRef.current) return false;
      const pos = stageRef.current?.getPointerPosition();
      if (!pos) return false;
      const dx = pos.x - panStartRef.current.x;
      const dy = pos.y - panStartRef.current.y;
      setPanOffset({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      return true;
    };

    const handlePanMouseUp = () => {
      if (!isPanning) return false;
      setIsPanning(false);
      panStartRef.current = null;
      return true;
    };

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

    useImperativeHandle(
      ref,
      () => ({
        exportImage: (format: "png" | "jpg" = "png") => {
          if (!stageRef.current) return null;

          transformerRef.current?.nodes([]);
          stageRef.current.batchDraw();

          const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
          const quality = format === "jpg" ? 1.0 : undefined;
          const pixelRatio = image.width / (image.width * layout.scale);

          const exportConfig = !hasBackground
            ? {
                x: layout.stageX + layout.imageOffsetX * layout.scale,
                y: layout.stageY + layout.imageOffsetY * layout.scale,
                width: image.width * layout.scale,
                height: image.height * layout.scale,
                pixelRatio,
                imageSmoothingEnabled: false,
              }
            : {
                x: layout.stageX,
                y: layout.stageY,
                width: layout.scaledWidth,
                height: layout.scaledHeight,
                pixelRatio: layout.bgWidth / layout.scaledWidth,
                imageSmoothingEnabled: false,
              };

          const canvas = stageRef.current.toCanvas(exportConfig);
          return canvas.toDataURL(mimeType, quality);
        },
        exportImageData: () => {
          if (!stageRef.current) return null;

          transformerRef.current?.nodes([]);
          stageRef.current.batchDraw();

          const pixelRatio = hasBackground
            ? layout.bgWidth / layout.scaledWidth
            : image.width / (image.width * layout.scale);

          const config = hasBackground
            ? {
                x: layout.stageX,
                y: layout.stageY,
                width: layout.scaledWidth,
                height: layout.scaledHeight,
                pixelRatio,
              }
            : {
                x: layout.stageX + layout.imageOffsetX * layout.scale,
                y: layout.stageY + layout.imageOffsetY * layout.scale,
                width: image.width * layout.scale,
                height: image.height * layout.scale,
                pixelRatio,
              };

          const canvas = stageRef.current.toCanvas(config);
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        },
        exportForClipboard: () => {
          if (!stageRef.current) return Promise.resolve(null);

          transformerRef.current?.nodes([]);
          stageRef.current.batchDraw();

          const pixelRatio = hasBackground
            ? layout.bgWidth / layout.scaledWidth
            : image.width / (image.width * layout.scale);

          const config = hasBackground
            ? {
                x: layout.stageX,
                y: layout.stageY,
                width: layout.scaledWidth,
                height: layout.scaledHeight,
                pixelRatio,
                mimeType: "image/jpeg" as const,
                quality: 0.92,
              }
            : {
                x: layout.stageX + layout.imageOffsetX * layout.scale,
                y: layout.stageY + layout.imageOffsetY * layout.scale,
                width: image.width * layout.scale,
                height: image.height * layout.scale,
                pixelRatio,
                mimeType: "image/jpeg" as const,
                quality: 0.92,
              };

          return new Promise((resolve) => {
            stageRef.current!.toBlob({
              ...config,
              callback: (blob) => resolve(blob),
            });
          });
        },
      }),
      [layout, image.width, image.height, hasBackground],
    );

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
