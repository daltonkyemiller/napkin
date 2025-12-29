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

function chaikinSubdivide(points: Point[], iterations = 2): Point[] {
  if (points.length < 2) return points;

  let result = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [result[0]];

    for (let i = 0; i < result.length - 1; i++) {
      const p0 = result[i];
      const p1 = result[i + 1];

      next.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      next.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }

    next.push(result[result.length - 1]);
    result = next;
  }

  return result;
}

function reducePoints(points: Point[], minDistance = 2): Point[] {
  if (points.length < 2) return points;

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const last = result[result.length - 1];
    const curr = points[i];
    const dist = Math.sqrt((curr.x - last.x) ** 2 + (curr.y - last.y) ** 2);

    if (dist >= minDistance || i === points.length - 1) {
      result.push(curr);
    }
  }

  return result;
}

export function simplifyPath(flatPoints: number[]): number[] {
  if (flatPoints.length < 6) return flatPoints;

  const points = flatToPoints(flatPoints);
  const reduced = reducePoints(points, 3);
  const smoothed = chaikinSubdivide(reduced, 3);
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
