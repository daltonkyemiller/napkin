import { create } from "zustand";
import type { Tool } from "@/types";

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
  fontSize: number;
  isDrawing: boolean;
  editingTextId: string | null;
  ocrSelection: OcrSelection | null;

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
  setFontSize: (size: number) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setEditingTextId: (id: string | null) => void;
  setOcrSelection: (selection: OcrSelection | null) => void;
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
  fontSize: 24,
  isDrawing: false,
  editingTextId: null,
  ocrSelection: null,

  setCanvasSize: (width, height) => set({ width, height }),

  setImage: (url, width, height) =>
    set({
      imageUrl: url,
      imageWidth: width,
      imageHeight: height,
    }),

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
  setFontSize: (fontSize) => set({ fontSize }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setEditingTextId: (editingTextId) => set({ editingTextId }),
  setOcrSelection: (ocrSelection) => set({ ocrSelection }),
}));
