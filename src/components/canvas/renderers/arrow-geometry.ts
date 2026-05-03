export interface ArrowGeometry {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  bend: number;
  pointerLength: number;
  pointerWidth: number;
}

export interface BendedArrowCalcs {
  ctrlX: number;
  ctrlY: number;
  angle: number;
  shortenedEndX: number;
  shortenedEndY: number;
}

export interface StraightArrowCalcs {
  angle: number;
  shortenedEndX: number;
  shortenedEndY: number;
}

export function calculateBendedArrow(geo: ArrowGeometry, shortenBy: number): BendedArrowCalcs {
  const { startX, startY, endX, endY, bend } = geo;

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;
  const ctrlX = midX + perpX * bend;
  const ctrlY = midY + perpY * bend;

  const tangentX = endX - ctrlX;
  const tangentY = endY - ctrlY;
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
  const normTangentX = tangentX / tangentLen;
  const normTangentY = tangentY / tangentLen;
  const angle = Math.atan2(tangentY, tangentX);

  const shortenedEndX = endX - normTangentX * shortenBy;
  const shortenedEndY = endY - normTangentY * shortenBy;

  return { ctrlX, ctrlY, angle, shortenedEndX, shortenedEndY };
}

export function calculateStraightArrow(geo: ArrowGeometry, shortenBy: number): StraightArrowCalcs {
  const { startX, startY, endX, endY } = geo;

  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const angle = Math.atan2(dy, dx);
  const shortenedEndX = endX - (dx / len) * shortenBy;
  const shortenedEndY = endY - (dy / len) * shortenBy;

  return { angle, shortenedEndX, shortenedEndY };
}

export function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  pointerLength: number,
  pointerWidth: number,
  stroke: string,
  strokeWidth: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-pointerLength, -pointerWidth / 2);
  ctx.lineTo(0, 0);
  ctx.lineTo(-pointerLength, pointerWidth / 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}
