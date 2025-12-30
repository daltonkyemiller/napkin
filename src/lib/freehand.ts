import { getStroke, StrokeOptions } from "perfect-freehand";

export type InputPoint = [x: number, y: number, pressure: number];

export const defaultFreehandOptions: StrokeOptions = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t) => t,
  simulatePressure: true,
  start: {
    cap: true,
    taper: 0,
  },
  end: {
    cap: true,
    taper: 0,
  },
};

export function getSvgPathFromStroke(points: number[][], closed = true): string {
  const len = points.length;

  if (len < 4) {
    return "";
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  const average = (a: number, b: number) => (a + b) / 2;

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
  }

  if (closed) {
    result += "Z";
  }

  return result;
}

export interface FreehandStrokeData {
  path: string;
  bounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  };
}

export function getFreehandStroke(
  points: InputPoint[],
  options?: Partial<StrokeOptions>,
): FreehandStrokeData {
  const strokeOptions = { ...defaultFreehandOptions, ...options };
  const outlinePoints = getStroke(points, strokeOptions);

  if (outlinePoints.length === 0) {
    return {
      path: "",
      bounds: { minX: 0, minY: 0, width: 0, height: 0 },
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of outlinePoints) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    path: getSvgPathFromStroke(outlinePoints),
    bounds: {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}
