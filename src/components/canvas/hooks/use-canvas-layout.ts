import { useMemo } from "react";
import { ASPECT_RATIOS } from "@/stores/background-store";

interface UseCanvasLayoutParams {
  image: { width: number; height: number };
  containerWidth: number;
  containerHeight: number;
  padding: number;
  aspectRatio: string;
  hasBackground: boolean;
  bgImageElement: HTMLImageElement | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };
}

export interface CanvasLayout {
  scale: number;
  bgWidth: number;
  bgHeight: number;
  imageOffsetX: number;
  imageOffsetY: number;
  stageX: number;
  stageY: number;
  scaledWidth: number;
  scaledHeight: number;
  contentWidth: number;
  contentHeight: number;
  bgImageScale: number;
  bgImageX: number;
  bgImageY: number;
}

export function useCanvasLayout({
  image,
  containerWidth,
  containerHeight,
  padding,
  aspectRatio,
  hasBackground,
  bgImageElement,
  zoomLevel,
  panOffset,
}: UseCanvasLayoutParams): CanvasLayout {
  return useMemo(() => {
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
}
