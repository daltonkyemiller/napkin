import { useCallback, type RefObject } from "react";
import type Konva from "konva";
import type { CanvasLayout } from "./use-canvas-layout";

interface UseCanvasExportParams {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRef: RefObject<Konva.Transformer | null>;
  layout: CanvasLayout;
  image: { width: number; height: number };
  hasBackground: boolean;
}

export interface CanvasExportHandle {
  exportImage: (format?: "png" | "jpg") => string | null;
  exportImageData: () => ImageData | null;
  exportForClipboard: () => Promise<Blob | null>;
}

export function useCanvasExport({
  stageRef,
  transformerRef,
  layout,
  image,
  hasBackground,
}: UseCanvasExportParams): CanvasExportHandle {
  const getExportConfig = useCallback(
    (forBackground: boolean) => {
      if (!forBackground) {
        const pixelRatio = image.width / (image.width * layout.scale);
        return {
          x: layout.stageX + layout.imageOffsetX * layout.scale,
          y: layout.stageY + layout.imageOffsetY * layout.scale,
          width: image.width * layout.scale,
          height: image.height * layout.scale,
          pixelRatio,
          imageSmoothingEnabled: false,
        };
      }
      return {
        x: layout.stageX,
        y: layout.stageY,
        width: layout.scaledWidth,
        height: layout.scaledHeight,
        pixelRatio: layout.bgWidth / layout.scaledWidth,
        imageSmoothingEnabled: false,
      };
    },
    [layout, image.width, image.height]
  );

  const prepareForExport = useCallback(() => {
    transformerRef.current?.nodes([]);
    stageRef.current?.batchDraw();
  }, [stageRef, transformerRef]);

  const exportImage = useCallback(
    (format: "png" | "jpg" = "png") => {
      if (!stageRef.current) return null;

      prepareForExport();

      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      const quality = format === "jpg" ? 1.0 : undefined;
      const exportConfig = getExportConfig(hasBackground);

      const canvas = stageRef.current.toCanvas(exportConfig);
      return canvas.toDataURL(mimeType, quality);
    },
    [stageRef, hasBackground, getExportConfig, prepareForExport]
  );

  const exportImageData = useCallback(() => {
    if (!stageRef.current) return null;

    prepareForExport();

    const exportConfig = getExportConfig(hasBackground);
    const canvas = stageRef.current.toCanvas(exportConfig);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [stageRef, hasBackground, getExportConfig, prepareForExport]);

  const exportForClipboard = useCallback(async () => {
    if (!stageRef.current) return null;

    prepareForExport();

    const exportConfig = getExportConfig(hasBackground);

    return new Promise<Blob | null>((resolve) => {
      stageRef.current!.toBlob({
        ...exportConfig,
        mimeType: "image/jpeg",
        quality: 0.92,
        callback: (blob) => resolve(blob),
      });
    });
  }, [stageRef, hasBackground, getExportConfig, prepareForExport]);

  return {
    exportImage,
    exportImageData,
    exportForClipboard,
  };
}
