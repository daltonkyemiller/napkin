import { useMemo, useRef, useCallback } from "react";
import rough from "roughjs";
import type { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable } from "roughjs/bin/core";

export function useRoughGenerator() {
  const roughGenerator = useMemo(() => rough.generator(), []);
  const roughDrawablesRef = useRef<Map<string, { key: string; drawable: Drawable }>>(new Map());

  const getRoughDrawable = useCallback(
    (id: string, cacheKey: string, createDrawable: (gen: RoughGenerator) => Drawable): Drawable => {
      const cached = roughDrawablesRef.current.get(id);
      if (cached && cached.key === cacheKey) {
        return cached.drawable;
      }
      const drawable = createDrawable(roughGenerator);
      roughDrawablesRef.current.set(id, { key: cacheKey, drawable });
      return drawable;
    },
    [roughGenerator],
  );

  return { getRoughDrawable };
}
