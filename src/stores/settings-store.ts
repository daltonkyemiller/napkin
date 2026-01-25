import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useCanvasStore, type StrokeSizePreset, type SketchinessPreset } from "./canvas-store";
import { STROKE_COLORS } from "@/constants";

export type SaveFormat = "png" | "jpg";

interface AppSettings {
  strokeSizePreset: StrokeSizePreset;
  fontSize: number;
  sketchinessPreset: SketchinessPreset;
  defaultSaveLocation: string | null;
  autoSaveToDefault: boolean;
  closeAfterSave: boolean;
  palette: string[];
  defaultSaveFormat: SaveFormat;
  copyToClipboardOnSave: boolean;
  closeAfterCopy: boolean;
  selectModeAfterDrawing: boolean;
  openFolderAfterSave: boolean;
}

interface SettingsStore extends AppSettings {
  isLoaded: boolean;
  setStrokeSizePreset: (preset: StrokeSizePreset) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setSketchinessPreset: (preset: SketchinessPreset) => Promise<void>;
  setDefaultSaveLocation: (location: string | null) => Promise<void>;
  setAutoSaveToDefault: (enabled: boolean) => Promise<void>;
  setCloseAfterSave: (enabled: boolean) => Promise<void>;
  setPalette: (palette: string[]) => Promise<void>;
  setDefaultSaveFormat: (format: SaveFormat) => Promise<void>;
  setCopyToClipboardOnSave: (enabled: boolean) => Promise<void>;
  setCloseAfterCopy: (enabled: boolean) => Promise<void>;
  setSelectModeAfterDrawing: (enabled: boolean) => Promise<void>;
  setOpenFolderAfterSave: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  strokeSizePreset: "M",
  fontSize: 24,
  sketchinessPreset: "medium",
  defaultSaveLocation: null,
  autoSaveToDefault: false,
  closeAfterSave: true,
  palette: [...STROKE_COLORS],
  defaultSaveFormat: "png",
  copyToClipboardOnSave: true,
  closeAfterCopy: false,
  selectModeAfterDrawing: true,
  openFolderAfterSave: false,
};

async function persistSettings(settings: Partial<AppSettings>) {
  const currentState = useSettingsStore.getState();
  const fullSettings: AppSettings = {
    strokeSizePreset: settings.strokeSizePreset ?? currentState.strokeSizePreset,
    fontSize: settings.fontSize ?? currentState.fontSize,
    sketchinessPreset: settings.sketchinessPreset ?? currentState.sketchinessPreset,
    defaultSaveLocation: settings.defaultSaveLocation ?? currentState.defaultSaveLocation,
    autoSaveToDefault: settings.autoSaveToDefault ?? currentState.autoSaveToDefault,
    closeAfterSave: settings.closeAfterSave ?? currentState.closeAfterSave,
    palette: settings.palette ?? currentState.palette,
    defaultSaveFormat: settings.defaultSaveFormat ?? currentState.defaultSaveFormat,
    copyToClipboardOnSave: settings.copyToClipboardOnSave ?? currentState.copyToClipboardOnSave,
    closeAfterCopy: settings.closeAfterCopy ?? currentState.closeAfterCopy,
    selectModeAfterDrawing: settings.selectModeAfterDrawing ?? currentState.selectModeAfterDrawing,
    openFolderAfterSave: settings.openFolderAfterSave ?? currentState.openFolderAfterSave,
  };
  await invoke("save_settings", { settings: fullSettings });
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  setStrokeSizePreset: async (strokeSizePreset) => {
    set({ strokeSizePreset });
    await persistSettings({ strokeSizePreset });
  },

  setFontSize: async (fontSize) => {
    set({ fontSize });
    await persistSettings({ fontSize });
  },

  setSketchinessPreset: async (sketchinessPreset) => {
    set({ sketchinessPreset });
    useCanvasStore.getState().setSketchinessPreset(sketchinessPreset);
    await persistSettings({ sketchinessPreset });
  },

  setDefaultSaveLocation: async (defaultSaveLocation) => {
    set({ defaultSaveLocation });
    await persistSettings({ defaultSaveLocation });
  },

  setAutoSaveToDefault: async (autoSaveToDefault) => {
    set({ autoSaveToDefault });
    await persistSettings({ autoSaveToDefault });
  },

  setCloseAfterSave: async (closeAfterSave) => {
    set({ closeAfterSave });
    await persistSettings({ closeAfterSave });
  },

  setPalette: async (palette) => {
    set({ palette });
    await persistSettings({ palette });
  },

  setDefaultSaveFormat: async (defaultSaveFormat) => {
    set({ defaultSaveFormat });
    await persistSettings({ defaultSaveFormat });
  },

  setCopyToClipboardOnSave: async (copyToClipboardOnSave) => {
    set({ copyToClipboardOnSave });
    await persistSettings({ copyToClipboardOnSave });
  },

  setCloseAfterCopy: async (closeAfterCopy) => {
    set({ closeAfterCopy });
    await persistSettings({ closeAfterCopy });
  },

  setSelectModeAfterDrawing: async (selectModeAfterDrawing) => {
    set({ selectModeAfterDrawing });
    await persistSettings({ selectModeAfterDrawing });
  },

  setOpenFolderAfterSave: async (openFolderAfterSave) => {
    set({ openFolderAfterSave });
    await persistSettings({ openFolderAfterSave });
  },

  loadSettings: async () => {
    try {
      const settings = await invoke<AppSettings | null>("load_settings");
      if (settings) {
        const strokeSizePreset = settings.strokeSizePreset ?? DEFAULT_SETTINGS.strokeSizePreset;
        const fontSize = settings.fontSize ?? DEFAULT_SETTINGS.fontSize;
        const sketchinessPreset = settings.sketchinessPreset ?? DEFAULT_SETTINGS.sketchinessPreset;

        set({
          strokeSizePreset,
          fontSize,
          sketchinessPreset,
          defaultSaveLocation: settings.defaultSaveLocation ?? DEFAULT_SETTINGS.defaultSaveLocation,
          autoSaveToDefault: settings.autoSaveToDefault ?? DEFAULT_SETTINGS.autoSaveToDefault,
          closeAfterSave: settings.closeAfterSave ?? DEFAULT_SETTINGS.closeAfterSave,
          palette: settings.palette ?? DEFAULT_SETTINGS.palette,
          defaultSaveFormat: settings.defaultSaveFormat ?? DEFAULT_SETTINGS.defaultSaveFormat,
          copyToClipboardOnSave:
            settings.copyToClipboardOnSave ?? DEFAULT_SETTINGS.copyToClipboardOnSave,
          closeAfterCopy: settings.closeAfterCopy ?? DEFAULT_SETTINGS.closeAfterCopy,
          selectModeAfterDrawing:
            settings.selectModeAfterDrawing ?? DEFAULT_SETTINGS.selectModeAfterDrawing,
          openFolderAfterSave:
            settings.openFolderAfterSave ?? DEFAULT_SETTINGS.openFolderAfterSave,
          isLoaded: true,
        });

        useCanvasStore.getState().setStrokeSizePreset(strokeSizePreset);
        useCanvasStore.getState().setSketchinessPreset(sketchinessPreset);
        useCanvasStore.getState().setFontSize(fontSize);
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      set({ isLoaded: true });
    }
  },
}));
