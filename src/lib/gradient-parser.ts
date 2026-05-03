export interface GradientConfig {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  colorStops: (number | string)[];
}

export function parseGradient(
  gradientStr: string,
  width: number,
  height: number,
): GradientConfig | null {
  const match = gradientStr.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
  if (!match) return null;

  const angle = parseInt(match[1]);
  const angleRad = (angle - 90) * (Math.PI / 180);

  const diagonal = Math.sqrt(width * width + height * height);
  const centerX = width / 2;
  const centerY = height / 2;

  const startX = centerX - (Math.cos(angleRad) * diagonal) / 2;
  const startY = centerY - (Math.sin(angleRad) * diagonal) / 2;
  const endX = centerX + (Math.cos(angleRad) * diagonal) / 2;
  const endY = centerY + (Math.sin(angleRad) * diagonal) / 2;

  const colorStops: (number | string)[] = [];
  const stops = match[2].split(/,(?![^(]*\))/);
  stops.forEach((stop: string) => {
    const colorMatch = stop.trim().match(/(.+?)\s+(\d+)%/);
    if (colorMatch) {
      colorStops.push(parseFloat(colorMatch[2]) / 100, colorMatch[1].trim());
    }
  });

  return {
    startPoint: { x: startX, y: startY },
    endPoint: { x: endX, y: endY },
    colorStops,
  };
}
