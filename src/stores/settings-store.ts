import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useCanvasStore } from "./canvas-store";
import { STROKE_COLORS } from "@/constants";

interface AppSettings {
  strokeWidth: number;
  fontSize: number;
  sketchiness: number;
  defaultSaveLocation: string | null;
  autoSaveToDefault: boolean;
  closeAfterSave: boolean;
  palette: string[];
}

interface SettingsStore extends AppSettings {
  isLoaded: boolean;
  setStrokeWidth: (width: number) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setSketchiness: (sketchiness: number) => Promise<void>;
  setDefaultSaveLocation: (location: string | null) => Promise<void>;
  setAutoSaveToDefault: (enabled: boolean) => Promise<void>;
  setCloseAfterSave: (enabled: boolean) => Promise<void>;
  setPalette: (palette: string[]) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  strokeWidth: 3,
  fontSize: 24,
  sketchiness: 1.5,
  defaultSaveLocation: null,
  autoSaveToDefault: false,
  closeAfterSave: true,
  palette: [...STROKE_COLORS],
};

async function persistSettings(settings: Partial<AppSettings>) {
  const currentState = useSettingsStore.getState();
  const fullSettings: AppSettings = {
    strokeWidth: settings.strokeWidth ?? currentState.strokeWidth,
    fontSize: settings.fontSize ?? currentState.fontSize,
    sketchiness: settings.sketchiness ?? currentState.sketchiness,
    defaultSaveLocation: settings.defaultSaveLocation ?? currentState.defaultSaveLocation,
    autoSaveToDefault: settings.autoSaveToDefault ?? currentState.autoSaveToDefault,
    closeAfterSave: settings.closeAfterSave ?? currentState.closeAfterSave,
    palette: settings.palette ?? currentState.palette,
  };
  await invoke("save_settings", { settings: fullSettings });
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  setStrokeWidth: async (strokeWidth) => {
    set({ strokeWidth });
    await persistSettings({ strokeWidth });
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

  loadSettings: async () => {
    try {
      const settings = await invoke<AppSettings | null>("load_settings");
      if (settings) {
        const strokeWidth = settings.strokeWidth ?? DEFAULT_SETTINGS.strokeWidth;
        const fontSize = settings.fontSize ?? DEFAULT_SETTINGS.fontSize;
        
        set({
          strokeWidth,
          fontSize,
          sketchiness: settings.sketchiness ?? DEFAULT_SETTINGS.sketchiness,
          defaultSaveLocation: settings.defaultSaveLocation ?? DEFAULT_SETTINGS.defaultSaveLocation,
          autoSaveToDefault: settings.autoSaveToDefault ?? DEFAULT_SETTINGS.autoSaveToDefault,
          closeAfterSave: settings.closeAfterSave ?? DEFAULT_SETTINGS.closeAfterSave,
          palette: settings.palette ?? DEFAULT_SETTINGS.palette,
          isLoaded: true,
        });
        
        useCanvasStore.getState().setStrokeWidth(strokeWidth);
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
