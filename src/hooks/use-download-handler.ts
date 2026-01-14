import { useCallback, type RefObject } from "react";
import type { AnnotationCanvasHandle } from "@/components/canvas/annotation-canvas";
import type { SaveFormat } from "@/stores/settings-store";
import { invoke } from "@tauri-apps/api/core";
import { join, tempDir } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";

interface UseDownloadHandlerParams {
  canvasRef: RefObject<AnnotationCanvasHandle | null>;
  outputFilename: string | null;
  defaultSaveLocation: string | null;
  autoSaveToDefault: boolean;
  closeAfterSave: boolean;
  copyToClipboardOnSave: boolean;
  openFolderAfterSave: boolean;
}

export function useDownloadHandler({
  canvasRef,
  outputFilename,
  defaultSaveLocation,
  autoSaveToDefault,
  closeAfterSave,
  copyToClipboardOnSave,
  openFolderAfterSave,
}: UseDownloadHandlerParams) {
  return useCallback(
    async (format: SaveFormat) => {
      const result = canvasRef.current?.exportImage(format);
      if (!result) return;
      const dataURL = await Promise.resolve(result);
      if (!dataURL) return;

      const ext = format === "jpg" ? "jpg" : "png";
      const filterName = format === "jpg" ? "JPEG Image" : "PNG Image";

      let filePath: string | null = outputFilename;

      if (!filePath) {
        if (autoSaveToDefault && defaultSaveLocation) {
          filePath = `${defaultSaveLocation}/annotated-image-${Date.now()}.${ext}`;
        } else {
          const defaultPath = defaultSaveLocation
            ? `${defaultSaveLocation}/annotated-image-${Date.now()}.${ext}`
            : `annotated-image-${Date.now()}.${ext}`;

          filePath = await save({
            defaultPath,
            filters: [{ name: filterName, extensions: [ext] }],
          });
        }
      }

      if (!filePath) return;

      const response = await fetch(dataURL);
      const arrayBuffer = await response.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);

      await writeFile(filePath, binaryData);

      if (copyToClipboardOnSave) {
        const pngDataURL = canvasRef.current?.exportImage("png");
        if (pngDataURL) {
          const pngResponse = await fetch(pngDataURL);
          const pngBuffer = await pngResponse.arrayBuffer();
          const tempPath = await join(await tempDir(), `napkin-clipboard-${Date.now()}.png`);
          await writeFile(tempPath, new Uint8Array(pngBuffer));
          invoke("copy_image_to_clipboard_from_path", { path: tempPath });
        }
      }

      const fileName = filePath.split("/").pop() || filePath.split("\\").pop() || "image";
      const savedFilePath = filePath;

      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
      if (permissionGranted) {
        sendNotification({
          title: "Image Saved",
          body: fileName,
        });
      }

      if (openFolderAfterSave) {
        revealItemInDir(savedFilePath);
      }

      if (!closeAfterSave) {
        toast.success("Image saved", {
          description: fileName,
          action: {
            label: "Show in Folder",
            onClick: () => revealItemInDir(savedFilePath),
          },
        });
      }

      if (closeAfterSave) {
        await getCurrentWindow().close();
      }
    },
    [
      canvasRef,
      outputFilename,
      defaultSaveLocation,
      autoSaveToDefault,
      closeAfterSave,
      copyToClipboardOnSave,
      openFolderAfterSave,
    ],
  );
}
