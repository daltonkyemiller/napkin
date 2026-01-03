import { useState, useCallback, type RefObject } from "react";
import type Konva from "konva";

interface OcrSelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseOcrSelectionParams {
  stageRef: RefObject<Konva.Stage | null>;
  image: HTMLImageElement;
  scaledWidth: number;
  scaledHeight: number;
  imageX: number;
  imageY: number;
  onOcrRegionSelected?: (
    imageData: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
}

export function useOcrSelection({
  stageRef,
  image,
  scaledWidth,
  scaledHeight,
  imageX,
  imageY,
  onOcrRegionSelected,
}: UseOcrSelectionParams) {
  const [ocrSelectionStart, setOcrSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [ocrSelectionRect, setOcrSelectionRect] = useState<OcrSelectionRect | null>(null);

  const handleOcrMouseDown = useCallback((): boolean => {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return false;
    setOcrSelectionStart(pos);
    setOcrSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    return true;
  }, [stageRef]);

  const handleOcrMouseMove = useCallback((): boolean => {
    if (!ocrSelectionStart) return false;

    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return false;

    const x = Math.min(ocrSelectionStart.x, pos.x);
    const y = Math.min(ocrSelectionStart.y, pos.y);
    const rectWidth = Math.abs(pos.x - ocrSelectionStart.x);
    const rectHeight = Math.abs(pos.y - ocrSelectionStart.y);
    setOcrSelectionRect({ x, y, width: rectWidth, height: rectHeight });
    return true;
  }, [stageRef, ocrSelectionStart]);

  const handleOcrMouseUp = useCallback((): boolean => {
    if (!ocrSelectionStart || !ocrSelectionRect) return false;

    if (ocrSelectionRect.width > 10 && ocrSelectionRect.height > 10 && onOcrRegionSelected) {
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
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
    return true;
  }, [
    ocrSelectionStart,
    ocrSelectionRect,
    image,
    scaledWidth,
    scaledHeight,
    imageX,
    imageY,
    onOcrRegionSelected,
  ]);

  return {
    ocrSelectionRect,
    ocrSelectionStart,
    handleOcrMouseDown,
    handleOcrMouseMove,
    handleOcrMouseUp,
  };
}
