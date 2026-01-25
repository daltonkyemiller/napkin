import { create } from "zustand";
import type { Tool } from "@/types";

export type StrokeSizePreset = "S" | "M" | "L" | "XL" | "custom";
export type SketchinessPreset = "none" | "subtle" | "medium" | "heavy";

export const STROKE_PRESETS: Record<Exclude<StrokeSizePreset, "custom">, number> = {
  S: 0.003,
  M: 0.006,
  L: 0.012,
  XL: 0.025,
};

// Sketchiness scales with image diagonal using square root for smoother scaling
const REFERENCE_DIAGONAL = 1500;
export const SKETCHINESS_PRESETS: Record<SketchinessPreset, number> = {
  none: 0,
  subtle: 0.8,
  medium: 1.5,
  heavy: 2.5,
};

export function calculateStrokeWidth(
  preset: StrokeSizePreset,
  customWidth: number,
  imageWidth: number,
  imageHeight: number,
): number {
  if (preset === "custom") return customWidth;
  const diagonal = Math.sqrt(imageWidth ** 2 + imageHeight ** 2);
  return Math.max(1, Math.round(diagonal * STROKE_PRESETS[preset]));
}

export function calculateSketchiness(
  preset: SketchinessPreset,
  imageWidth: number,
  imageHeight: number,
): number {
  if (preset === "none") return 0;
  const diagonal = Math.sqrt(imageWidth ** 2 + imageHeight ** 2);
  // Use square root scaling for more moderate adjustments
  const scale = Math.sqrt(diagonal / REFERENCE_DIAGONAL);
  return SKETCHINESS_PRESETS[preset] * scale;
}

export interface OcrSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasStore {
  width: number;
  height: number;
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  selectedId: string | null;
  selectedIds: string[];
  activeTool: Tool;
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  strokeSizePreset: StrokeSizePreset;
  customStrokeWidth: number;
  sketchinessPreset: SketchinessPreset;
  sketchiness: number;
  fontSize: number;
  isDrawing: boolean;
  editingTextId: string | null;
  ocrSelection: OcrSelection | null;
  zoomLevel: number;
  panOffset: { x: number; y: number };

  setCanvasSize: (width: number, height: number) => void;
  setImage: (url: string, width: number, height: number) => void;
  clearImage: () => void;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  selectAnnotation: (id: string, shiftKey?: boolean) => void;
  clearSelection: () => void;
  setActiveTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string | null) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeSizePreset: (preset: StrokeSizePreset) => void;
  setCustomStrokeWidth: (width: number) => void;
  setSketchinessPreset: (preset: SketchinessPreset) => void;
  setFontSize: (size: number) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setEditingTextId: (id: string | null) => void;
  setOcrSelection: (selection: OcrSelection | null) => void;
  setZoomLevel: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  resetZoom: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  width: window.innerWidth,
  height: window.innerHeight,
  imageUrl: null,
  imageWidth: 0,
  imageHeight: 0,
  selectedId: null,
  selectedIds: [],
  activeTool: "select",
  strokeColor: "#ef4444",
  fillColor: null,
  strokeWidth: 3,
  strokeSizePreset: "M" as StrokeSizePreset,
  customStrokeWidth: 3,
  sketchinessPreset: "medium" as SketchinessPreset,
  sketchiness: SKETCHINESS_PRESETS.medium,
  fontSize: 24,
  isDrawing: false,
  editingTextId: null,
  ocrSelection: null,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },

  setCanvasSize: (width, height) => set({ width, height }),

  setImage: (url, width, height) => {
    const { strokeSizePreset, customStrokeWidth, sketchinessPreset } = get();
    const strokeWidth = calculateStrokeWidth(strokeSizePreset, customStrokeWidth, width, height);
    const sketchiness = calculateSketchiness(sketchinessPreset, width, height);
    set({
      imageUrl: url,
      imageWidth: width,
      imageHeight: height,
      strokeWidth,
      sketchiness,
    });
  },

  clearImage: () =>
    set({
      imageUrl: null,
      imageWidth: 0,
      imageHeight: 0,
    }),

  setSelectedId: (selectedId) => set({ selectedId }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),

  selectAnnotation: (id, shiftKey = false) => {
    const { selectedIds } = get();
    if (shiftKey) {
      if (selectedIds.includes(id)) {
        const newSelection = selectedIds.filter((sid) => sid !== id);
        set({
          selectedIds: newSelection,
          selectedId: newSelection[newSelection.length - 1] ?? null,
        });
      } else {
        const newSelection = [...selectedIds, id];
        set({ selectedIds: newSelection, selectedId: id });
      }
    } else {
      set({ selectedId: id, selectedIds: [id] });
    }
  },

  clearSelection: () =>
    set({
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
    }),

  setActiveTool: (activeTool) => set({ activeTool }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setStrokeSizePreset: (preset) => {
    const { imageWidth, imageHeight, customStrokeWidth } = get();
    const strokeWidth = calculateStrokeWidth(preset, customStrokeWidth, imageWidth, imageHeight);
    set({ strokeSizePreset: preset, strokeWidth });
  },
  setCustomStrokeWidth: (width) => {
    const { strokeSizePreset } = get();
    if (strokeSizePreset === "custom") {
      set({ customStrokeWidth: width, strokeWidth: width });
    } else {
      set({ customStrokeWidth: width });
    }
  },
  setSketchinessPreset: (preset) => {
    const { imageWidth, imageHeight } = get();
    const sketchiness = calculateSketchiness(preset, imageWidth, imageHeight);
    set({ sketchinessPreset: preset, sketchiness });
  },
  setFontSize: (fontSize) => set({ fontSize }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setEditingTextId: (editingTextId) => set({ editingTextId }),
  setOcrSelection: (ocrSelection) => set({ ocrSelection }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.max(0.1, Math.min(5, zoomLevel)) }),
  setPanOffset: (panOffset) => set({ panOffset }),
  resetZoom: () => set({ zoomLevel: 1, panOffset: { x: 0, y: 0 } }),
}));
