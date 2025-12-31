import { Circle } from "react-konva";
import type Konva from "konva";
import type { ArrowAnnotation, RectangleAnnotation } from "@/types";

const CORNER_RADIUS_HANDLE_OFFSET = 16;

export function rotatePoint(x: number, y: number, angleDeg: number) {
  const radians = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

export function getArrowCurveMidpoint(arrow: ArrowAnnotation) {
  const [startX, startY, endX, endY] = arrow.points;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const bend = arrow.bend ?? 0;
  if (bend === 0) {
    return { x: midX, y: midY };
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { x: midX, y: midY };

  const perpX = -dy / length;
  const perpY = dx / length;

  return {
    x: midX + perpX * bend * 0.5,
    y: midY + perpY * bend * 0.5,
  };
}

export function getCornerRadiusHandlePosition(rect: RectangleAnnotation) {
  const cornerRadius = rect.cornerRadius ?? 0;
  const scaleX = rect.scaleX ?? 1;
  const scaleY = rect.scaleY ?? 1;
  const rotation = rect.rotation ?? 0;
  const signX = Math.sign(rect.width) || 1;
  const signY = Math.sign(rect.height) || 1;

  const offset = cornerRadius + CORNER_RADIUS_HANDLE_OFFSET;
  const scaledX = offset * scaleX * signX;
  const scaledY = offset * scaleY * signY;

  const rotated = rotatePoint(scaledX, scaledY, rotation);

  return {
    x: rect.x + rotated.x,
    y: rect.y + rotated.y,
  };
}

interface ArrowHandlesProps {
  arrow: ArrowAnnotation;
  getStageCoords: (x: number, y: number) => { x: number; y: number };
  getImageCoords: (x: number, y: number) => { x: number; y: number };
  updateAnnotation: (id: string, updates: Partial<ArrowAnnotation>) => void;
}

export function ArrowHandles({
  arrow,
  getStageCoords,
  getImageCoords,
  updateAnnotation,
}: ArrowHandlesProps) {
  const [startX, startY, endX, endY] = arrow.points;
  const mid = getArrowCurveMidpoint(arrow);
  const startStage = getStageCoords(arrow.x + startX, arrow.y + startY);
  const midStage = getStageCoords(arrow.x + mid.x, arrow.y + mid.y);
  const endStage = getStageCoords(arrow.x + endX, arrow.y + endY);

  const handleArrowStartDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const imagePos = getImageCoords(node.x(), node.y());
    const [, , eX, eY] = arrow.points;
    const newStartX = imagePos.x - arrow.x;
    const newStartY = imagePos.y - arrow.y;
    updateAnnotation(arrow.id, {
      points: [newStartX, newStartY, eX, eY],
    });
  };

  const handleArrowEndDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const imagePos = getImageCoords(node.x(), node.y());
    const [sX, sY] = arrow.points;
    const newEndX = imagePos.x - arrow.x;
    const newEndY = imagePos.y - arrow.y;
    updateAnnotation(arrow.id, {
      points: [sX, sY, newEndX, newEndY],
    });
  };

  const handleArrowMidDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const imagePos = getImageCoords(node.x(), node.y());
    const [sX, sY, eX, eY] = arrow.points;

    const midX = (sX + eX) / 2;
    const midY = (sY + eY) / 2;

    const dx = eX - sX;
    const dy = eY - sY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    const perpX = -dy / length;
    const perpY = dx / length;

    const handleX = imagePos.x - arrow.x;
    const handleY = imagePos.y - arrow.y;

    const offsetX = handleX - midX;
    const offsetY = handleY - midY;
    const bend = (offsetX * perpX + offsetY * perpY) * 2;

    updateAnnotation(arrow.id, { bend });
  };

  return (
    <>
      <Circle
        x={startStage.x}
        y={startStage.y}
        radius={6}
        fill="#4F46E5"
        stroke="#fff"
        strokeWidth={2}
        draggable
        onDragMove={handleArrowStartDrag}
        hitStrokeWidth={10}
      />
      <Circle
        x={midStage.x}
        y={midStage.y}
        radius={6}
        fill="#10b981"
        stroke="#fff"
        strokeWidth={2}
        draggable
        onDragMove={handleArrowMidDrag}
        hitStrokeWidth={10}
      />
      <Circle
        x={endStage.x}
        y={endStage.y}
        radius={6}
        fill="#4F46E5"
        stroke="#fff"
        strokeWidth={2}
        draggable
        onDragMove={handleArrowEndDrag}
        hitStrokeWidth={10}
      />
    </>
  );
}

interface CornerRadiusHandleProps {
  rectangle: RectangleAnnotation;
  getStageCoords: (x: number, y: number) => { x: number; y: number };
  getImageCoords: (x: number, y: number) => { x: number; y: number };
  updateAnnotation: (id: string, updates: Partial<RectangleAnnotation>) => void;
}

export function CornerRadiusHandle({
  rectangle,
  getStageCoords,
  getImageCoords,
  updateAnnotation,
}: CornerRadiusHandleProps) {
  const imagePos = getCornerRadiusHandlePosition(rectangle);
  const stagePos = getStageCoords(imagePos.x, imagePos.y);

  const cornerRadiusDragBoundFunc = (pos: { x: number; y: number }) => {
    const imgPos = getImageCoords(pos.x, pos.y);
    const rotation = rectangle.rotation ?? 0;
    const scaleX = rectangle.scaleX ?? 1;
    const scaleY = rectangle.scaleY ?? 1;
    const signX = Math.sign(rectangle.width) || 1;
    const signY = Math.sign(rectangle.height) || 1;

    const dx = imgPos.x - rectangle.x;
    const dy = imgPos.y - rectangle.y;

    const unrotated = rotatePoint(dx, dy, -rotation);
    const localX = (unrotated.x / scaleX) * signX;
    const localY = (unrotated.y / scaleY) * signY;

    const maxRadius = Math.min(Math.abs(rectangle.width), Math.abs(rectangle.height)) / 2;

    const diagonalPos = (localX + localY) / 2;
    const minOffset = CORNER_RADIUS_HANDLE_OFFSET;
    const maxOffset = maxRadius + CORNER_RADIUS_HANDLE_OFFSET;
    const clampedOffset = Math.max(minOffset, Math.min(diagonalPos, maxOffset));

    const rotatedImage = rotatePoint(
      clampedOffset * scaleX * signX,
      clampedOffset * scaleY * signY,
      rotation,
    );

    const clampedImagePos = {
      x: rectangle.x + rotatedImage.x,
      y: rectangle.y + rotatedImage.y,
    };
    return getStageCoords(clampedImagePos.x, clampedImagePos.y);
  };

  const handleCornerRadiusDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const imgPos = getImageCoords(node.x(), node.y());
    const rotation = rectangle.rotation ?? 0;
    const scaleX = rectangle.scaleX ?? 1;
    const signX = Math.sign(rectangle.width) || 1;

    const dx = imgPos.x - rectangle.x;
    const dy = imgPos.y - rectangle.y;

    const unrotated = rotatePoint(dx, dy, -rotation);
    const localOffset = (unrotated.x / scaleX) * signX;
    const localRadius = localOffset - CORNER_RADIUS_HANDLE_OFFSET;

    const maxRadius = Math.min(Math.abs(rectangle.width), Math.abs(rectangle.height)) / 2;
    const clampedRadius = Math.max(0, Math.min(localRadius, maxRadius));

    updateAnnotation(rectangle.id, { cornerRadius: Math.round(clampedRadius) });
  };

  return (
    <Circle
      x={stagePos.x}
      y={stagePos.y}
      radius={6}
      fill="#4F46E5"
      stroke="#fff"
      strokeWidth={2}
      draggable
      dragBoundFunc={cornerRadiusDragBoundFunc}
      onDragMove={handleCornerRadiusDrag}
      hitStrokeWidth={10}
    />
  );
}
