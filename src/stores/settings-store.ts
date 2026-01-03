import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useCanvasStore, type StrokeSizePreset } from "./canvas-store";
import { STROKE_COLORS } from "@/constants";

export type SaveFormat = "png" | "jpg";

interface AppSettings {
  strokeSizePreset: StrokeSizePreset;
  fontSize: number;
  sketchiness: number;
  defaultSaveLocation: string | null;
  autoSaveToDefault: boolean;
  closeAfterSave: boolean;
  palette: string[];
  defaultSaveFormat: SaveFormat;
}

interface SettingsStore extends AppSettings {
  isLoaded: boolean;
  setStrokeSizePreset: (preset: StrokeSizePreset) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setSketchiness: (sketchiness: number) => Promise<void>;
  setDefaultSaveLocation: (location: string | null) => Promise<void>;
  setAutoSaveToDefault: (enabled: boolean) => Promise<void>;
  setCloseAfterSave: (enabled: boolean) => Promise<void>;
  setPalette: (palette: string[]) => Promise<void>;
  setDefaultSaveFormat: (format: SaveFormat) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  strokeSizePreset: "M",
  fontSize: 24,
  sketchiness: 1.5,
  defaultSaveLocation: null,
  autoSaveToDefault: false,
  closeAfterSave: true,
  palette: [...STROKE_COLORS],
  defaultSaveFormat: "png",
};

async function persistSettings(settings: Partial<AppSettings>) {
  const currentState = useSettingsStore.getState();
  const fullSettings: AppSettings = {
    strokeSizePreset: settings.strokeSizePreset ?? currentState.strokeSizePreset,
    fontSize: settings.fontSize ?? currentState.fontSize,
    sketchiness: settings.sketchiness ?? currentState.sketchiness,
    defaultSaveLocation: settings.defaultSaveLocation ?? currentState.defaultSaveLocation,
    autoSaveToDefault: settings.autoSaveToDefault ?? currentState.autoSaveToDefault,
    closeAfterSave: settings.closeAfterSave ?? currentState.closeAfterSave,
    palette: settings.palette ?? currentState.palette,
    defaultSaveFormat: settings.defaultSaveFormat ?? currentState.defaultSaveFormat,
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

  setSketchiness: async (sketchiness) => {
    set({ sketchiness });
    await persistSettings({ sketchiness });
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

  loadSettings: async () => {
    try {
      const settings = await invoke<AppSettings | null>("load_settings");
      if (settings) {
        const strokeSizePreset = settings.strokeSizePreset ?? DEFAULT_SETTINGS.strokeSizePreset;
        const fontSize = settings.fontSize ?? DEFAULT_SETTINGS.fontSize;

        set({
          strokeSizePreset,
          fontSize,
          sketchiness: settings.sketchiness ?? DEFAULT_SETTINGS.sketchiness,
          defaultSaveLocation: settings.defaultSaveLocation ?? DEFAULT_SETTINGS.defaultSaveLocation,
          autoSaveToDefault: settings.autoSaveToDefault ?? DEFAULT_SETTINGS.autoSaveToDefault,
          closeAfterSave: settings.closeAfterSave ?? DEFAULT_SETTINGS.closeAfterSave,
          palette: settings.palette ?? DEFAULT_SETTINGS.palette,
          defaultSaveFormat: settings.defaultSaveFormat ?? DEFAULT_SETTINGS.defaultSaveFormat,
          isLoaded: true,
        });

        useCanvasStore.getState().setStrokeSizePreset(strokeSizePreset);
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
