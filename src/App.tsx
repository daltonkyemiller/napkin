import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  AnnotationCanvas,
  type AnnotationCanvasHandle,
} from "@/components/canvas/annotation-canvas";
import { MainToolbar } from "@/components/toolbar/main-toolbar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { Button } from "@/components/ui/button";
import { Upload, ImageIcon } from "lucide-react";

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<AnnotationCanvasHandle>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    imageUrl,
    setImage: setImageInStore,
    selectedIds,
    clearSelection,
    setActiveTool,
    activeTool,
  } = useCanvasStore();

  const { annotations, deleteAnnotations, clearAnnotations, updateAnnotation } =
    useAnnotationStore();
  const temporal = useAnnotationStore.temporal;

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

    const filePath = await save({
      defaultPath: `annotated-image-${Date.now()}.png`,
      filters: [{ name: "PNG Image", extensions: ["png"] }],
    });

    if (!filePath) return;

    const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    await writeFile(filePath, binaryData);
  }, []);

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

      {!image ? (
        <div className="flex h-full flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-16 w-16" />
            <h1 className="text-2xl font-semibold text-foreground">Image Annotator</h1>
            <p className="text-sm">Upload an image to start annotating</p>
          </div>
          <Button onClick={handleUploadClick} size="lg">
            <Upload className="mr-2 h-5 w-5" />
            Select Image
          </Button>
          <p className="text-xs text-muted-foreground">Or drag and drop an image anywhere</p>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <MainToolbar onUploadClick={handleUploadClick} onDownload={handleDownload} />
          <div className="flex-1 overflow-hidden">
            <AnnotationCanvas ref={canvasRef} image={image} />
          </div>
        </div>
      )}
    </div>
  );
}
