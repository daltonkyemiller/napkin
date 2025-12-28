interface Point {
  x: number;
  y: number;
}

function flatToPoints(flatPoints: number[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    points.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }
  return points;
}

function pointsToFlat(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

function smoothPoints(points: Point[], iterations = 2): Point[] {
  if (points.length < 3) return points;

  let smoothed = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [smoothed[0]];

    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const curr = smoothed[i];
      const nextPt = smoothed[i + 1];

      next.push({
        x: curr.x * 0.5 + (prev.x + nextPt.x) * 0.25,
        y: curr.y * 0.5 + (prev.y + nextPt.y) * 0.25,
      });
    }

    next.push(smoothed[smoothed.length - 1]);
    smoothed = next;
  }

  return smoothed;
}

export function simplifyPath(flatPoints: number[]): number[] {
  if (flatPoints.length < 6) return flatPoints;

  const points = flatToPoints(flatPoints);
  const smoothed = smoothPoints(points, 8);
  return pointsToFlat(smoothed);
}

const CLOSE_THRESHOLD = 30;

export function closePathIfNearStart(flatPoints: number[]): { points: number[]; closed: boolean } {
  if (flatPoints.length < 6) return { points: flatPoints, closed: false };

  const startX = flatPoints[0];
  const startY = flatPoints[1];
  const endX = flatPoints[flatPoints.length - 2];
  const endY = flatPoints[flatPoints.length - 1];

  const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);

  if (distance < CLOSE_THRESHOLD) {
    const closedPoints = [...flatPoints];
    closedPoints[closedPoints.length - 2] = startX;
    closedPoints[closedPoints.length - 1] = startY;
    return { points: closedPoints, closed: true };
  }

  return { points: flatPoints, closed: false };
}
