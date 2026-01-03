import { create } from "zustand";

export interface GradientPreset {
  id: string;
  name: string;
  value: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "none", name: "None", value: "transparent" },
  { id: "sunset", name: "Sunset", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "ocean", name: "Ocean", value: "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)" },
  { id: "forest", name: "Forest", value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
  { id: "fire", name: "Fire", value: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  {
    id: "aurora",
    name: "Aurora",
    value: "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #7c3aed 100%)",
  },
  { id: "rose", name: "Rose", value: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)" },
  { id: "midnight", name: "Midnight", value: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
  { id: "cosmic", name: "Cosmic", value: "linear-gradient(135deg, #ff00cc 0%, #333399 100%)" },
  { id: "peach", name: "Peach", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
  { id: "mint", name: "Mint", value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
  { id: "lavender", name: "Lavender", value: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)" },
  { id: "ember", name: "Ember", value: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)" },
];

export type BackgroundType = "none" | "gradient" | "image";

export type AspectRatio = "auto" | "16:9" | "4:3" | "1:1" | "9:16" | "3:4";

export const ASPECT_RATIOS: { id: AspectRatio; label: string; value: number | null }[] = [
  { id: "auto", label: "Auto", value: null },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
];

interface BackgroundStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  backgroundType: BackgroundType;
  gradientPreset: string;
  customImage: string | null;
  padding: number;
  borderRadius: number;
  shadowSize: number;
  shadowColor: string;
  aspectRatio: AspectRatio;
  blur: number;
  imageHasTransparency: boolean;

  setBackgroundType: (type: BackgroundType) => void;
  setGradientPreset: (preset: string) => void;
  setCustomImage: (image: string | null) => void;
  setPadding: (padding: number) => void;
  setBorderRadius: (radius: number) => void;
  setShadowSize: (size: number) => void;
  setShadowColor: (color: string) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setBlur: (blur: number) => void;
  setImageHasTransparency: (hasTransparency: boolean) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  backgroundType: "none" as BackgroundType,
  gradientPreset: "sunset",
  customImage: null,
  padding: 40,
  borderRadius: 12,
  shadowSize: 20,
  shadowColor: "rgba(0, 0, 0, 0.3)",
  aspectRatio: "auto" as AspectRatio,
  blur: 0,
  imageHasTransparency: false,
};

export const useBackgroundStore = create<BackgroundStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  ...DEFAULT_STATE,

  setBackgroundType: (backgroundType) => set({ backgroundType }),
  setGradientPreset: (gradientPreset) => set({ gradientPreset, backgroundType: "gradient" }),
  setCustomImage: (customImage) =>
    set({ customImage, backgroundType: customImage ? "image" : "none" }),
  setPadding: (padding) => set({ padding }),
  setBorderRadius: (borderRadius) => set({ borderRadius }),
  setShadowSize: (shadowSize) => set({ shadowSize }),
  setShadowColor: (shadowColor) => set({ shadowColor }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setBlur: (blur) => set({ blur }),
  setImageHasTransparency: (imageHasTransparency) => set({ imageHasTransparency }),
  reset: () => set(DEFAULT_STATE),
}));
