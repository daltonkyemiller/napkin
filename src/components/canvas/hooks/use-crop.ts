import { useState, useCallback, type RefObject } from "react";
import type Konva from "konva";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseCropParams {
  stageRef: RefObject<Konva.Stage | null>;
  image: HTMLImageElement;
  getImageCoords: (stageX: number, stageY: number) => { x: number; y: number };
}

export function useCrop({ stageRef, image, getImageCoords }: UseCropParams) {
  const [cropSelectionStart, setCropSelectionStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [cropSelectionRect, setCropSelectionRect] = useState<CropRect | null>(null);

  const handleCropMouseDown = useCallback((): boolean => {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return false;

    const imagePos = getImageCoords(pos.x, pos.y);
    setCropSelectionStart(imagePos);
    setCropSelectionRect({ x: imagePos.x, y: imagePos.y, width: 0, height: 0 });
    return true;
  }, [stageRef, getImageCoords]);

  const handleCropMouseMove = useCallback((): boolean => {
    if (!cropSelectionStart) return false;

    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return false;

    const imagePos = getImageCoords(pos.x, pos.y);

    const x = Math.min(cropSelectionStart.x, imagePos.x);
    const y = Math.min(cropSelectionStart.y, imagePos.y);
    const width = Math.abs(imagePos.x - cropSelectionStart.x);
    const height = Math.abs(imagePos.y - cropSelectionStart.y);
    setCropSelectionRect({ x, y, width, height });
    return true;
  }, [stageRef, cropSelectionStart, getImageCoords]);

  const handleCropMouseUp = useCallback((): boolean => {
    if (!cropSelectionStart || !cropSelectionRect) return false;

    if (cropSelectionRect.width < 10 || cropSelectionRect.height < 10) {
      setCropSelectionStart(null);
      setCropSelectionRect(null);
      return true;
    }

    // Clamp crop region to image bounds
    const cropX = Math.max(0, Math.round(cropSelectionRect.x));
    const cropY = Math.max(0, Math.round(cropSelectionRect.y));
    const cropRight = Math.min(
      image.width,
      Math.round(cropSelectionRect.x + cropSelectionRect.width),
    );
    const cropBottom = Math.min(
      image.height,
      Math.round(cropSelectionRect.y + cropSelectionRect.height),
    );
    const cropWidth = cropRight - cropX;
    const cropHeight = cropBottom - cropY;

    if (cropWidth < 1 || cropHeight < 1) {
      setCropSelectionStart(null);
      setCropSelectionRect(null);
      return true;
    }

    // Create cropped image
    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCropSelectionStart(null);
      setCropSelectionRect(null);
      return true;
    }

    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    const croppedUrl = canvas.toDataURL("image/png");

    // Save pre-crop state for undo
    const canvasState = useCanvasStore.getState();
    const annotations = useAnnotationStore.getState().annotations;
    canvasState.pushCropSnapshot({
      imageUrl: canvasState.imageUrl!,
      imageWidth: canvasState.imageWidth,
      imageHeight: canvasState.imageHeight,
      annotations: annotations.map((a) => ({ ...a })),
    });

    // Pause undo tracking — crop is undone via crop history, not Zundo
    useAnnotationStore.temporal.getState().pause();

    // Adjust all annotation positions relative to the crop
    const { setAnnotations } = useAnnotationStore.getState();
    const adjusted = annotations.map((a) => ({
      ...a,
      x: a.x - cropX,
      y: a.y - cropY,
    }));
    setAnnotations(adjusted);

    useAnnotationStore.temporal.getState().resume();
    useAnnotationStore.temporal.getState().clear();

    // Update the image in the store
    canvasState.setImage(croppedUrl, cropWidth, cropHeight);
    canvasState.setActiveTool("select");
    canvasState.resetZoom();

    setCropSelectionStart(null);
    setCropSelectionRect(null);
    return true;
  }, [cropSelectionStart, cropSelectionRect, image]);

  return {
    cropSelectionStart,
    cropSelectionRect,
    handleCropMouseDown,
    handleCropMouseMove,
    handleCropMouseUp,
  };
}
