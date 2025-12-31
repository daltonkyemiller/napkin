import {
  AnnotationCanvas,
  type AnnotationCanvasHandle,
} from "@/components/canvas/annotation-canvas";
import { OcrResultDialog } from "@/components/ocr/ocr-result-dialog";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { FloatingElementToolbar } from "@/components/toolbar/floating-element-toolbar";
import { MainToolbar } from "@/components/toolbar/main-toolbar";
import { Button } from "@/components/ui/button";
import { DEFAULT_FONT_FAMILY } from "@/constants";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useCanvasStore } from "@/stores/canvas-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useThemeStore } from "@/stores/theme-store";
import type { TextAnnotation } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";

const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
import { writeFile } from "@tauri-apps/plugin-fs";
import { IconImageOutlineDuo18, IconUpload3OutlineDuo18 } from "nucleo-ui-outline-duo-18";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Toaster } from "sonner";

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { annotations, deleteAnnotations, clearAnnotations, updateAnnotation, addAnnotation } =
    useAnnotationStore();
  const temporal = useAnnotationStore.temporal;
  const { strokeColor, fontSize } = useCanvasStore();
  const { loadTheme, applyTheme, mode } = useThemeStore();
  const { loadSettings, defaultSaveLocation } = useSettingsStore();

  useEffect(() => {
    loadTheme().then(() => applyTheme());
    loadSettings();
  }, [loadTheme, applyTheme, loadSettings]);

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
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          setImageInStore(url, img.width, img.height);
          clearAnnotations();
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    },
    [setImageInStore, clearAnnotations],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDownload = useCallback(async () => {
    const dataURL = canvasRef.current?.exportImage();
    if (!dataURL) return;

    let filePath: string | null = outputFilename;

    if (!filePath) {
      const defaultPath = defaultSaveLocation
        ? `${defaultSaveLocation}/annotated-image-${Date.now()}.png`
        : `annotated-image-${Date.now()}.png`;

      filePath = await save({
        defaultPath,
        filters: [{ name: "PNG Image", extensions: ["png"] }],
      });
    }

    if (!filePath) return;

    const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    await writeFile(filePath, binaryData);
  }, [outputFilename, defaultSaveLocation]);

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
  useHotkeys("mod+s", () => handleDownload(), { preventDefault: true });
  useHotkeys("o", () => setActiveTool("ocr"));

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
    <div
      role="application"
      className="h-screen w-screen overflow-hidden bg-muted"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

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

      {isLoading ? (
        <div className="flex h-full items-center justify-center" />
      ) : !image ? (
        <div className="flex h-full flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <IconImageOutlineDuo18 className="size-24" />
            <h1 className="text-2xl font-semibold text-foreground">Napkin</h1>
            <p className="text-sm">Upload an image to start annotating</p>
          </div>
          <Button onClick={handleUploadClick} size="lg">
            <IconUpload3OutlineDuo18 />
            Select Image
          </Button>
          <p className="text-xs text-muted-foreground">Or drag and drop an image anywhere</p>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <MainToolbar
            onUploadClick={handleUploadClick}
            onDownload={handleDownload}
            onSettingsClick={() => setSettingsOpen(true)}
          />
          <div ref={canvasContainerRef} className="relative flex-1 overflow-hidden">
            <AnnotationCanvas
              ref={canvasRef}
              image={image}
              onOcrRegionSelected={handleOcrRegionSelected}
            />
            <FloatingElementToolbar containerRef={canvasContainerRef} image={image} />
          </div>
        </div>
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
}
