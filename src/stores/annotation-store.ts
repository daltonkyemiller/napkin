import { create } from "zustand";
import { temporal } from "zundo";
import type { Annotation } from "@/types";

interface AnnotationState {
  annotations: Annotation[];
}

interface AnnotationActions {
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  deleteAnnotations: (ids: string[]) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  getAnnotationById: (id: string) => Annotation | undefined;
  clearAnnotations: () => void;
}

type AnnotationStore = AnnotationState & AnnotationActions;

export const useAnnotationStore = create<AnnotationStore>()(
  temporal(
    (set, get) => ({
      annotations: [],

      addAnnotation: (annotation: Annotation) =>
        set((state) => ({ annotations: [...state.annotations, annotation] })),

      updateAnnotation: (id: string, updates: Partial<Annotation>) =>
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === id ? ({ ...ann, ...updates } as Annotation) : ann,
          ),
        })),

      deleteAnnotation: (id: string) =>
        set((state) => ({
          annotations: state.annotations.filter((ann) => ann.id !== id),
        })),

      deleteAnnotations: (ids: string[]) =>
        set((state) => ({
          annotations: state.annotations.filter((ann) => !ids.includes(ann.id)),
        })),

      setAnnotations: (annotations: Annotation[]) => set({ annotations }),

      getAnnotationById: (id: string) => get().annotations.find((ann) => ann.id === id),

      clearAnnotations: () => set({ annotations: [] }),
    }),
    {
      limit: 50,
      partialize: (state) => ({ annotations: state.annotations }),
    },
  ),
);
