import { useIconStore } from "@/stores/icon-store";
import { lucideFallbackMap } from "@/icons/lucide-fallback";
import type { IconName } from "@/icons/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, className, strokeWidth = 2 }: IconProps) {
  const iconMapping = useIconStore((s) => s.iconMapping);
  const customSvgs = useIconStore((s) => s.customSvgs);

  const customSvg = useMemo(() => {
    const hasCustom = iconMapping[name];
    return hasCustom ? customSvgs.get(name) : null;
  }, [name, iconMapping, customSvgs]);

  if (customSvg) {
    let processedSvg = customSvg
      .replace(/<svg([^>]*)\swidth="[^"]*"/g, `<svg$1 width="${size}"`)
      .replace(/<svg([^>]*)\sheight="[^"]*"/g, `<svg$1 height="${size}"`)
      .replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`)
      .replace(/stroke="black"/gi, 'stroke="currentColor"')
      .replace(/stroke="#000000"/gi, 'stroke="currentColor"')
      .replace(/stroke="#000"/gi, 'stroke="currentColor"')
      .replace(/fill="black"/gi, 'fill="currentColor"')
      .replace(/fill="#000000"/gi, 'fill="currentColor"')
      .replace(/fill="#000"/gi, 'fill="currentColor"');

    if (!processedSvg.includes("fill=")) {
      processedSvg = processedSvg.replace(/<svg/, '<svg fill="currentColor"');
    }

    return (
      <span
        className={cn("inline-flex items-center justify-center shrink-0", className)}
        style={{ width: size, height: size, color: "inherit" }}
        dangerouslySetInnerHTML={{ __html: processedSvg }}
      />
    );
  }

  const LucideComponent = lucideFallbackMap[name];
  if (!LucideComponent) {
    console.warn(`Icon not found: ${name}`);
    return null;
  }

  return (
    <LucideComponent size={size} className={cn("shrink-0", className)} strokeWidth={strokeWidth} />
  );
}
