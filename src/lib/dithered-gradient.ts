interface GradientColorStop {
  offset: number;
  r: number;
  g: number;
  b: number;
}

const BAYER_8X8 = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
];

const BAYER_SIZE = 8;
const BAYER_LEVELS = 64;
const DITHER_STRENGTH = 1.25;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function clampColor(value: number) {
  return Math.round(clamp(value, 0, 255));
}

function parseHexColor(color: string) {
  const hex = color.trim().replace("#", "");
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  if (hex.length !== 6) return null;

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function parseGradientStops(stopsString: string) {
  const stops = stopsString.split(/,(?![^(]*\))/);
  const colorStops: GradientColorStop[] = [];

  stops.forEach((stop) => {
    const colorMatch = stop.trim().match(/(#[0-9a-fA-F]{3,6})\s+(\d+)%/);
    if (!colorMatch) return;

    const color = parseHexColor(colorMatch[1]);
    if (!color) return;

    colorStops.push({
      offset: parseFloat(colorMatch[2]) / 100,
      ...color,
    });
  });

  return colorStops.sort((a, b) => a.offset - b.offset);
}

function getColorAtOffset(stops: GradientColorStop[], offset: number) {
  if (offset <= stops[0].offset) return stops[0];
  const lastStop = stops[stops.length - 1];
  if (offset >= lastStop.offset) return lastStop;

  for (let i = 1; i < stops.length; i++) {
    const end = stops[i];
    if (offset > end.offset) continue;

    const start = stops[i - 1];
    const range = end.offset - start.offset;
    const progress = range === 0 ? 0 : (offset - start.offset) / range;

    return {
      offset,
      r: start.r + (end.r - start.r) * progress,
      g: start.g + (end.g - start.g) * progress,
      b: start.b + (end.b - start.b) * progress,
    };
  }

  return lastStop;
}

export function createDitheredGradientUrl(
  gradientString: string,
  renderWidth: number,
  renderHeight: number,
) {
  const width = Math.max(1, Math.round(renderWidth));
  const height = Math.max(1, Math.round(renderHeight));
  const match = gradientString.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
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
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;
  const colorStops = parseGradientStops(match[2]);
  if (colorStops.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = ((x - startX) * dx + (y - startY) * dy) / lengthSquared;
      const color = getColorAtOffset(colorStops, clamp(offset, 0, 1));
      const bayerValue = BAYER_8X8[y % BAYER_SIZE][x % BAYER_SIZE];
      const dither = (bayerValue / (BAYER_LEVELS - 1) - 0.5) * DITHER_STRENGTH;
      const index = (y * width + x) * 4;

      pixels[index] = clampColor(color.r + dither);
      pixels[index + 1] = clampColor(color.g + dither);
      pixels[index + 2] = clampColor(color.b + dither);
      pixels[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
