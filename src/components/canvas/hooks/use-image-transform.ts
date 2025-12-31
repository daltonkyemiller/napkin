import { useMemo, useCallback } from "react";
import { stageToImageCoords, imageToStageCoords, type ImageTransform } from "@/lib/coordinates";

interface UseImageTransformParams {
  image: HTMLImageElement;
  canvasWidth: number;
  canvasHeight: number;
}

export function useImageTransform({ image, canvasWidth, canvasHeight }: UseImageTransformParams) {
  const imageScale = Math.min(canvasWidth / image.width, canvasHeight / image.height, 1);
  const scaledWidth = image.width * imageScale;
  const scaledHeight = image.height * imageScale;
  const imageX = (canvasWidth - scaledWidth) / 2;
  const imageY = (canvasHeight - scaledHeight) / 2;

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

  return {
    imageScale,
    scaledWidth,
    scaledHeight,
    imageX,
    imageY,
    imageTransform,
    getImageCoords,
    getStageCoords,
  };
}
