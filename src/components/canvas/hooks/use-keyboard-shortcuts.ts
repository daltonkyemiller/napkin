import { useEffect } from "react";
import type { Annotation } from "@/types";

interface UseKeyboardShortcutsProps {
  annotations: Annotation[];
  selectedIds: string[];
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  addAnnotation: (annotation: Annotation) => void;
}

export function useKeyboardShortcuts({
  annotations,
  selectedIds,
  setSelectedId,
  setSelectedIds,
  addAnnotation,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        if (isInputFocused) return;
        e.preventDefault();
        if (annotations.length > 0) {
          setSelectedIds(annotations.map((a) => a.id));
          setSelectedId(annotations[annotations.length - 1].id);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        if (isInputFocused) return;
        e.preventDefault();
        if (selectedIds.length === 0) return;

        const offset = 20;
        const newIds: string[] = [];

        for (const id of selectedIds) {
          const annotation = annotations.find((a) => a.id === id);
          if (!annotation) continue;

          const newId = `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const duplicate = {
            ...annotation,
            id: newId,
            x: annotation.x + offset,
            y: annotation.y + offset,
          };
          addAnnotation(duplicate);
          newIds.push(newId);
        }

        if (newIds.length > 0) {
          setSelectedIds(newIds);
          setSelectedId(newIds[newIds.length - 1]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [annotations, selectedIds, setSelectedId, setSelectedIds, addAnnotation]);
}
