import {
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Image, Transformer, Rect, Group } from "react-konva";
import type Konva from "konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useBackgroundStore, GRADIENT_PRESETS, ASPECT_RATIOS } from "@/stores/background-store";
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
  exportImage: () => string | Promise<string> | null;
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
      isDrawing,
      setSelectedId,
      setSelectedIds,
      clearSelection,
      setIsDrawing,
      setCanvasSize,
      setActiveTool,
    } = useCanvasStore();

    const { annotations, addAnnotation, updateAnnotation } = useAnnotationStore();
    const { sketchiness: defaultSketchiness } = useSettingsStore();
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
    } = useBackgroundStore();
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

    const backgroundValue = useMemo(() => {
      if (backgroundType === "none") return null;
      if (backgroundType === "image" && customImage) return customImage;
      if (backgroundType === "gradient") {
        const preset = GRADIENT_PRESETS.find((p) => p.id === gradientPreset);
        return preset?.value || null;
      }
      return null;
    }, [backgroundType, customImage, gradientPreset]);

    const hasBackground = backgroundType !== "none";

    useImperativeHandle(
      ref,
      () => ({
        exportImage: () => {
          if (!stageRef.current) return null;

          transformerRef.current?.nodes([]);
          stageRef.current.batchDraw();

          const pixelRatio = image.width / scaledWidth;

          if (!hasBackground) {
            return stageRef.current.toDataURL({
              x: imageX,
              y: imageY,
              width: scaledWidth,
              height: scaledHeight,
              pixelRatio,
            });
          }

          const exportPadding = padding * pixelRatio;
          let exportWidth = image.width + exportPadding * 2;
          let exportHeight = image.height + exportPadding * 2;
          const exportBorderRadius = borderRadius * pixelRatio;

          const ratioConfig = ASPECT_RATIOS.find((r) => r.id === aspectRatio);
          const targetRatio = ratioConfig?.value;
          if (targetRatio) {
            const currentRatio = exportWidth / exportHeight;
            if (currentRatio > targetRatio) {
              exportHeight = exportWidth / targetRatio;
            } else {
              exportWidth = exportHeight * targetRatio;
            }
          }

          const imageOffsetX = (exportWidth - image.width) / 2;
          const imageOffsetY = (exportHeight - image.height) / 2;

          const canvas = document.createElement("canvas");
          canvas.width = exportWidth;
          canvas.height = exportHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;

          const bgValue = backgroundValue;
          if (bgValue) {
            if (backgroundType === "image" && customImage) {
              const bgImg = new window.Image();
              bgImg.src = customImage;
              if (blur > 0) {
                ctx.filter = `blur(${blur * pixelRatio}px)`;
              }
              ctx.drawImage(bgImg, -blur * pixelRatio, -blur * pixelRatio, exportWidth + blur * pixelRatio * 2, exportHeight + blur * pixelRatio * 2);
              ctx.filter = "none";
            } else if (bgValue.includes("gradient")) {
              const gradientMatch = bgValue.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
              if (gradientMatch) {
                const angle = parseInt(gradientMatch[1]) * (Math.PI / 180);
                const centerX = exportWidth / 2;
                const centerY = exportHeight / 2;
                const length = Math.sqrt(exportWidth ** 2 + exportHeight ** 2) / 2;
                const x1 = centerX - Math.cos(angle) * length;
                const y1 = centerY - Math.sin(angle) * length;
                const x2 = centerX + Math.cos(angle) * length;
                const y2 = centerY + Math.sin(angle) * length;

                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                const colorStops = gradientMatch[2].split(/,(?![^(]*\))/);
                colorStops.forEach((stop: string) => {
                  const match = stop.trim().match(/(.+?)\s+(\d+)%/);
                  if (match) {
                    gradient.addColorStop(parseFloat(match[2]) / 100, match[1]);
                  }
                });
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, exportWidth, exportHeight);
              }
            }
          }

          if (shadowSize > 0) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowSize * pixelRatio;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = shadowSize * pixelRatio * 0.5;
          }

          ctx.beginPath();
          ctx.roundRect(imageOffsetX, imageOffsetY, image.width, image.height, exportBorderRadius);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.shadowColor = "transparent";

          const stageDataURL = stageRef.current.toDataURL({
            x: imageX,
            y: imageY,
            width: scaledWidth,
            height: scaledHeight,
            pixelRatio,
          });

          return new Promise<string>((resolve) => {
            const stageImg = new window.Image();
            stageImg.onload = () => {
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(imageOffsetX, imageOffsetY, image.width, image.height, exportBorderRadius);
              ctx.clip();
              ctx.drawImage(stageImg, imageOffsetX, imageOffsetY);
              ctx.restore();
              resolve(canvas.toDataURL("image/png"));
            };
            stageImg.src = stageDataURL;
          }) as unknown as string;
        },
      }),
      [imageX, imageY, scaledWidth, scaledHeight, image.width, image.height, hasBackground, backgroundType, backgroundValue, customImage, padding, borderRadius, shadowSize, shadowColor, aspectRatio, blur],
    );

    const handleTextDblClick = (annotation: TextAnnotation) => {
      startInlineEdit(annotation);
    };

    const handleTextTransform = (e: any) => {
      const node = e.target;
      node.setAttrs({
        width: Math.max(node.width() * node.scaleX(), 30),
        scaleX: 1,
        scaleY: 1,
      });
    };

    const handleTextTransformEnd = (annotation: TextAnnotation, e: any) => {
      const node = e.target;
      updateAnnotation(annotation.id, {
        width: node.width(),
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
      });
    };

    const selectedText = selectedIds.length === 1
      ? annotations.find((a) => a.id === selectedIds[0] && a.type === "text") as TextAnnotation | undefined
      : undefined;

    const previewPadding = padding * imageScale;
    const previewBorderRadius = borderRadius * imageScale;

    const getAspectRatioValue = () => {
      const ratio = ASPECT_RATIOS.find((r) => r.id === aspectRatio);
      return ratio?.value || null;
    };

    const aspectRatioValue = getAspectRatioValue();
    const previewWidth = scaledWidth + previewPadding * 2;
    const previewHeight = scaledHeight + previewPadding * 2;

    let bgWidth = previewWidth;
    let bgHeight = previewHeight;
    if (aspectRatioValue && hasBackground) {
      const currentRatio = previewWidth / previewHeight;
      if (currentRatio > aspectRatioValue) {
        bgHeight = previewWidth / aspectRatioValue;
      } else {
        bgWidth = previewHeight * aspectRatioValue;
      }
    }

    const bgX = imageX - previewPadding - (bgWidth - previewWidth) / 2;
    const bgY = imageY - previewPadding - (bgHeight - previewHeight) / 2;

    return (
      <div ref={containerRef} className="h-full w-full relative">
        {hasBackground && backgroundValue && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ background: backgroundType === "image" ? `url(${backgroundValue}) center/cover` : backgroundValue }}
          >
            <div
              className="absolute"
              style={{
                left: bgX,
                top: bgY,
                width: bgWidth,
                height: bgHeight,
                background: backgroundValue,
                backgroundSize: backgroundType === "image" ? "cover" : undefined,
                backgroundPosition: "center",
                filter: backgroundType === "image" && blur > 0 ? `blur(${blur}px)` : undefined,
              }}
            />
            <div
              className="absolute overflow-hidden"
              style={{
                left: imageX,
                top: imageY,
                width: scaledWidth,
                height: scaledHeight,
                borderRadius: previewBorderRadius,
                boxShadow: shadowSize > 0 ? `0 ${shadowSize * 0.5}px ${shadowSize}px ${shadowColor}` : undefined,
              }}
            />
          </div>
        )}
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
            <Image
              image={image}
              x={imageX}
              y={imageY}
              width={scaledWidth}
              height={scaledHeight}
              cornerRadius={hasBackground ? previewBorderRadius : 0}
            />
            <Group x={imageX} y={imageY} scaleX={imageScale} scaleY={imageScale}>
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
                    : ["top-left", "top-center", "top-right", "middle-right", "bottom-right", "bottom-center", "bottom-left", "middle-left"]
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
