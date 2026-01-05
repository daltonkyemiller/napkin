import { motion } from "motion/react";
import {
  AnnotationCanvas,
  type AnnotationCanvasHandle,
} from "@/components/canvas/annotation-canvas";
import { BackgroundSidebar } from "@/components/background/background-sidebar";
import { OcrResultDialog } from "@/components/ocr/ocr-result-dialog";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { FloatingElementToolbar } from "@/components/toolbar/floating-element-toolbar";
import { MainToolbar } from "@/components/toolbar/main-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_FONT_FAMILY } from "@/constants";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useBackgroundStore } from "@/stores/background-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { useIconStore } from "@/stores/icon-store";
import { useSettingsStore, type SaveFormat } from "@/stores/settings-store";
import { useThemeStore } from "@/stores/theme-store";
import type { TextAnnotation } from "@/types";
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

import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast, Toaster } from "sonner";

const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

export default function App() {
  const canvasRef = useRef<AnnotationCanvasHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [outputFilename, setOutputFilename] = useState<string | null>(null);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSelectionPosition, setOcrSelectionPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  const {
    imageUrl,
    setImage: setImageInStore,
    selectedIds,
    clearSelection,
    setActiveTool,
    activeTool,
  } = useCanvasStore();

  const { annotations, deleteAnnotations, updateAnnotation, addAnnotation } = useAnnotationStore();
  const temporal = useAnnotationStore.temporal;
  const { strokeColor, fontSize } = useCanvasStore();
  const { loadTheme, applyTheme, mode } = useThemeStore();
  const {
    loadSettings,
    defaultSaveLocation,
    autoSaveToDefault,
    closeAfterSave,
    defaultSaveFormat,
    copyToClipboardOnSave,
  } = useSettingsStore();
  const { loadIconMapping } = useIconStore();
  const { sidebarOpen, toggleSidebar, setImageHasTransparency } = useBackgroundStore();

  useEffect(() => {
    loadTheme().then(() => applyTheme());
    loadSettings();
    loadIconMapping();
  }, [loadTheme, applyTheme, loadSettings, loadIconMapping]);

  useEffect(() => {
    const handler = () => {
      if (mode === "system") {
        applyTheme();
      }
    };
    darkModeMediaQuery.addEventListener("change", handler);
    return () => darkModeMediaQuery.removeEventListener("change", handler);
  }, [mode, applyTheme]);

  useEffect(() => {
    async function loadFromCli() {
      try {
        const initialImage = await invoke<string | null>("get_initial_image");
        if (initialImage) {
          const img = new window.Image();
          img.onload = () => {
            setImageInStore(initialImage, img.width, img.height);
            setIsLoading(false);
          };
          img.onerror = () => {
            setIsLoading(false);
          };
          img.src = initialImage;
        } else {
          setIsLoading(false);
        }

        const outputPath = await invoke<string | null>("get_output_filename");
        if (outputPath) {
          setOutputFilename(outputPath);
        }

        const fullscreen = await invoke<boolean>("get_fullscreen");
        if (fullscreen) {
          getCurrentWindow().setFullscreen(true);
        }
      } catch (e) {
        console.error("Failed to load CLI args:", e);
        setIsLoading(false);
      }
    }
    loadFromCli();
  }, [setImageInStore]);

  useEffect(() => {
    if (!isLoading) {
      getCurrentWindow().show();
    }
  }, [isLoading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const imagePath = params.get("image");

    if (imagePath && !imageUrl) {
      const isAbsolutePath = imagePath.startsWith("/") || imagePath.match(/^[A-Za-z]:/);
      const isUrl = imagePath.startsWith("http://") || imagePath.startsWith("https://");

      let src: string;
      if (isUrl) {
        src = imagePath;
      } else if (isAbsolutePath) {
        src = `/__local_file__/${encodeURIComponent(imagePath)}`;
      } else {
        src = imagePath;
      }

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageInStore(src, img.width, img.height);
      };
      img.onerror = () => {
        console.error("Failed to load image from URL param:", imagePath);
      };
      img.src = src;
    }
  }, [imageUrl, setImageInStore]);

  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        let hasTransparency = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasTransparency = true;
            break;
          }
        }
        setImageHasTransparency(hasTransparency);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, setImageHasTransparency]);

  const copyToClipboard = useCallback(async () => {
    const dataURL = canvasRef.current?.exportImage("png");
    if (!dataURL) return;

    const response = await fetch(dataURL);
    const buffer = await response.arrayBuffer();

    const tempPath = await join(await tempDir(), `napkin-clipboard-${Date.now()}.png`);
    await writeFile(tempPath, new Uint8Array(buffer));

    invoke("copy_image_to_clipboard_from_path", { path: tempPath })
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  }, []);

  const handleDownload = useCallback(
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
        if (format === "png") {
          invoke("copy_image_to_clipboard_from_path", { path: filePath });
        } else {
          const pngDataURL = canvasRef.current?.exportImage("png");
          if (pngDataURL) {
            const pngResponse = await fetch(pngDataURL);
            const pngBuffer = await pngResponse.arrayBuffer();
            const tempPath = await join(await tempDir(), `napkin-clipboard-${Date.now()}.png`);
            await writeFile(tempPath, new Uint8Array(pngBuffer));
            invoke("copy_image_to_clipboard_from_path", { path: tempPath });
          }
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
    [outputFilename, defaultSaveLocation, autoSaveToDefault, closeAfterSave, copyToClipboardOnSave],
  );

  useHotkeys(
    "delete, backspace",
    () => {
      if (selectedIds.length > 0) {
        deleteAnnotations(selectedIds);
        clearSelection();
      }
    },
    { preventDefault: true },
  );

  useHotkeys("escape", () => {
    clearSelection();
    setActiveTool("select");
  });

  useHotkeys(
    "mod+z",
    () => {
      temporal.getState().undo();
    },
    { preventDefault: true },
  );

  useHotkeys(
    "mod+shift+z, mod+y",
    () => {
      temporal.getState().redo();
    },
    { preventDefault: true },
  );

  useHotkeys("v", () => setActiveTool("select"));
  useHotkeys("c", () => setActiveTool("circle"));
  useHotkeys("r", () => setActiveTool("rectangle"));
  useHotkeys("a", () => setActiveTool("arrow"));
  useHotkeys("t", () => setActiveTool("text"));
  useHotkeys("p", () => setActiveTool("freehand"));
  useHotkeys("m", () => setActiveTool("highlighter"));

  const moveSelected = useCallback(
    (dx: number, dy: number) => {
      if (activeTool !== "select" || selectedIds.length === 0) return;
      for (const id of selectedIds) {
        const annotation = annotations.find((a) => a.id === id);
        if (annotation) {
          updateAnnotation(id, { x: annotation.x + dx, y: annotation.y + dy });
        }
      }
    },
    [activeTool, selectedIds, annotations, updateAnnotation],
  );

  useHotkeys("up, k", () => moveSelected(0, -1), { preventDefault: true });
  useHotkeys("down, j", () => moveSelected(0, 1), { preventDefault: true });
  useHotkeys("left, h", () => moveSelected(-1, 0), { preventDefault: true });
  useHotkeys("right, l", () => moveSelected(1, 0), { preventDefault: true });

  useHotkeys("shift+up, shift+k", () => moveSelected(0, -10), { preventDefault: true });
  useHotkeys("shift+down, shift+j", () => moveSelected(0, 10), { preventDefault: true });
  useHotkeys("shift+left, shift+h", () => moveSelected(-10, 0), { preventDefault: true });
  useHotkeys("shift+right, shift+l", () => moveSelected(10, 0), { preventDefault: true });

  useHotkeys("mod+comma", () => setSettingsOpen(true), { preventDefault: true });
  useHotkeys("mod+s", () => handleDownload(defaultSaveFormat), { preventDefault: true });
  useHotkeys(
    "mod+c",
    () => {
      if (selectedIds.length === 0) {
        copyToClipboard();
      }
    },
    { preventDefault: selectedIds.length === 0 },
  );
  useHotkeys("o", () => setActiveTool("ocr"));
  useHotkeys("b", () => toggleSidebar());

  const handleOcrRegionSelected = useCallback(async (imageData: string, x: number, y: number) => {
    setOcrDialogOpen(true);
    setOcrLoading(true);
    setOcrError(null);
    setOcrText(null);
    setOcrSelectionPosition({ x, y });

    try {
      const text = await invoke<string>("perform_ocr", { imageData });
      setOcrText(text);
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcrLoading(false);
    }
  }, []);

  const handleCreateTextAnnotation = useCallback(
    (text: string) => {
      if (!ocrSelectionPosition) return;

      const textAnnotation: TextAnnotation = {
        id: `annotation_${Date.now()}`,
        type: "text",
        x: ocrSelectionPosition.x,
        y: ocrSelectionPosition.y,
        text,
        fontSize,
        fontFamily: DEFAULT_FONT_FAMILY,
        fill: strokeColor,
        stroke: null,
        strokeWidth: 0,
      };
      addAnnotation(textAnnotation);
      setActiveTool("select");
    },
    [ocrSelectionPosition, fontSize, strokeColor, addAnnotation, setActiveTool],
  );

  return (
    <div role="application" className="flex h-screen w-screen flex-col overflow-hidden bg-muted">
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <OcrResultDialog
        open={ocrDialogOpen}
        onOpenChange={setOcrDialogOpen}
        text={ocrText}
        isLoading={ocrLoading}
        error={ocrError}
        onCreateTextAnnotation={handleCreateTextAnnotation}
        selectionPosition={ocrSelectionPosition}
      />

      <MainToolbar
        onDownload={handleDownload}
        onCopyToClipboard={copyToClipboard}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: sidebarOpen ? 320 : 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="shrink-0 overflow-hidden border-r bg-background"
        >
          <BackgroundSidebar />
        </motion.div>

        <div ref={canvasContainerRef} className="relative flex-1 overflow-hidden">
          {isLoading || !image ? (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-3/4 w-3/4 bg-background" />
            </div>
          ) : (
            <>
              <AnnotationCanvas
                ref={canvasRef}
                image={image}
                onOcrRegionSelected={handleOcrRegionSelected}
              />
              <FloatingElementToolbar containerRef={canvasContainerRef} image={image} />
            </>
          )}
        </div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
