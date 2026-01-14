import { useMemo } from "react";
import type { Annotation, AnnotationType } from "@/types";

export function useAnnotationsByType<T extends Annotation = Annotation>(
  annotations: Annotation[],
  selectedIds: string[],
  types: AnnotationType[]
): T[] {
  return useMemo(
    () =>
      annotations.filter(
        (a) => selectedIds.includes(a.id) && types.includes(a.type)
      ) as T[],
    [annotations, selectedIds, types]
  );
}
