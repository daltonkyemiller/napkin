import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { IconMapping, IconName } from "@/icons/types";

interface IconStore {
  iconMapping: IconMapping;
  customSvgs: Map<IconName, string>;
  isLoaded: boolean;

  loadIconMapping: () => Promise<void>;
  setIconPath: (iconName: IconName, filePath: string | null) => Promise<void>;
  loadCustomSvg: (iconName: IconName) => Promise<void>;
  bulkSetIcons: (mapping: IconMapping) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useIconStore = create<IconStore>((set, get) => ({
  iconMapping: {},
  customSvgs: new Map(),
  isLoaded: false,

  loadIconMapping: async () => {
    try {
      const mapping = await invoke<IconMapping | null>("load_icon_mapping");
      set({ iconMapping: mapping || {}, isLoaded: true });

      const promises = Object.entries(mapping || {}).map(async ([name, path]) => {
        if (path) {
          await get().loadCustomSvg(name as IconName);
        }
      });
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to load icon mapping:", error);
      set({ isLoaded: true });
    }
  },

  setIconPath: async (iconName, filePath) => {
    const { iconMapping } = get();
    const newMapping = { ...iconMapping, [iconName]: filePath };

    await invoke("save_icon_mapping", { mapping: newMapping });
    set({ iconMapping: newMapping });

    if (filePath) {
      await get().loadCustomSvg(iconName);
    } else {
      const { customSvgs } = get();
      customSvgs.delete(iconName);
      set({ customSvgs: new Map(customSvgs) });
    }
  },

  loadCustomSvg: async (iconName) => {
    const { iconMapping } = get();
    const filePath = iconMapping[iconName];

    if (!filePath) return;

    try {
      const svgContent = await invoke<string>("load_svg_file", { filePath });
      const { customSvgs } = get();
      customSvgs.set(iconName, svgContent);
      set({ customSvgs: new Map(customSvgs) });
    } catch (error) {
      console.error(`Failed to load custom SVG for ${iconName}:`, error);
    }
  },

  bulkSetIcons: async (mapping) => {
    const { iconMapping } = get();
    const newMapping = { ...iconMapping, ...mapping };

    await invoke("save_icon_mapping", { mapping: newMapping });
    set({ iconMapping: newMapping });

    const promises = Object.entries(mapping).map(async ([name, path]) => {
      if (path) {
        await get().loadCustomSvg(name as IconName);
      }
    });
    await Promise.all(promises);
  },

  resetToDefaults: async () => {
    await invoke("save_icon_mapping", { mapping: {} });
    set({ iconMapping: {}, customSvgs: new Map() });
  },
}));
