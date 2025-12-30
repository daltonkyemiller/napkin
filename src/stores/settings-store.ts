import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface AppSettings {
  strokeWidth: number;
  fontSize: number;
  sketchiness: number;
  defaultSaveLocation: string | null;
}

interface SettingsStore extends AppSettings {
  isLoaded: boolean;
  setStrokeWidth: (width: number) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setSketchiness: (sketchiness: number) => Promise<void>;
  setDefaultSaveLocation: (location: string | null) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  strokeWidth: 3,
  fontSize: 24,
  sketchiness: 1.5,
  defaultSaveLocation: null,
};

async function persistSettings(settings: Partial<AppSettings>) {
  const currentState = useSettingsStore.getState();
  const fullSettings: AppSettings = {
    strokeWidth: settings.strokeWidth ?? currentState.strokeWidth,
    fontSize: settings.fontSize ?? currentState.fontSize,
    sketchiness: settings.sketchiness ?? currentState.sketchiness,
    defaultSaveLocation: settings.defaultSaveLocation ?? currentState.defaultSaveLocation,
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

  loadSettings: async () => {
    try {
      const settings = await invoke<AppSettings | null>("load_settings");
      if (settings) {
        set({
          strokeWidth: settings.strokeWidth ?? DEFAULT_SETTINGS.strokeWidth,
          fontSize: settings.fontSize ?? DEFAULT_SETTINGS.fontSize,
          sketchiness: settings.sketchiness ?? DEFAULT_SETTINGS.sketchiness,
          defaultSaveLocation: settings.defaultSaveLocation ?? DEFAULT_SETTINGS.defaultSaveLocation,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      set({ isLoaded: true });
    }
  },
}));
