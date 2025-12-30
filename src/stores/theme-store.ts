import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  mode: ThemeMode;
  customCss: string | null;
  isLoaded: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  setCustomCss: (css: string | null) => Promise<void>;
  loadTheme: () => Promise<void>;
  applyTheme: () => Promise<void>;
  resetCustomCss: () => Promise<void>;
}

function applyCustomCssToDocument(css: string | null) {
  let styleEl = document.getElementById("custom-theme-css");
  if (css) {
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "custom-theme-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  } else if (styleEl) {
    styleEl.remove();
  }
}

async function applyThemeModeToDocument(mode: ThemeMode) {
  let effectiveTheme: "light" | "dark" = "light";

  if (mode === "system") {
    const systemTheme = await getCurrentWindow().theme();
    effectiveTheme = systemTheme === "dark" ? "dark" : "light";
  } else {
    effectiveTheme = mode;
  }

  if (effectiveTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "system",
  customCss: null,
  isLoaded: false,

  setMode: async (mode) => {
    set({ mode });
    await applyThemeModeToDocument(mode);
    await invoke("save_theme_preference", { preference: mode });
  },

  setCustomCss: async (css) => {
    set({ customCss: css });
    applyCustomCssToDocument(css);
    if (css) {
      await invoke("save_theme_css", { css });
    }
  },

  resetCustomCss: async () => {
    set({ customCss: null });
    applyCustomCssToDocument(null);
    await invoke("save_theme_css", { css: "" });
  },

  loadTheme: async () => {
    try {
      const [preference, customCss] = await Promise.all([
        invoke<string | null>("load_theme_preference"),
        invoke<string | null>("load_theme_css"),
      ]);

      const mode = (preference as ThemeMode) || "system";
      const css = customCss && customCss.trim() ? customCss : null;

      set({ mode, customCss: css, isLoaded: true });
    } catch (error) {
      console.error("Failed to load theme:", error);
      set({ isLoaded: true });
    }
  },

  applyTheme: async () => {
    const { mode, customCss } = get();
    await applyThemeModeToDocument(mode);
    applyCustomCssToDocument(customCss);
  },
}));
