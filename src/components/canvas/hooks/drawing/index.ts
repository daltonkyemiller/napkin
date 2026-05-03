import { createCircleAnnotation, updateCircleAnnotation } from "./circle-drawing";
import { createRectangleAnnotation, updateRectangleAnnotation } from "./rectangle-drawing";
import { createArrowAnnotation, updateArrowAnnotation } from "./arrow-drawing";
import { createTextAnnotation } from "./text-drawing";
import { createFreehandAnnotation, updateFreehandAnnotation } from "./freehand-drawing";
import { createHighlighterAnnotation, updateHighlighterAnnotation } from "./highlighter-drawing";
import type {
  Annotation,
  CircleAnnotation,
  RectangleAnnotation,
  ArrowAnnotation,
  FreehandAnnotation,
  HighlighterAnnotation,
  Tool,
} from "@/types";

export interface DrawingParams {
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  fontSize: number;
  sketchiness: number;
}

type AnnotationCreator = (
  id: string,
  pos: { x: number; y: number },
  params: DrawingParams,
) => Annotation;

export const ANNOTATION_CREATORS: Partial<Record<Tool, AnnotationCreator>> = {
  circle: (id, pos, params) => createCircleAnnotation(id, pos, params),
  rectangle: (id, pos, params) => createRectangleAnnotation(id, pos, params),
  arrow: (id, pos, params) => createArrowAnnotation(id, pos, params),
  text: (id, pos, params) =>
    createTextAnnotation(id, pos, { strokeColor: params.strokeColor, fontSize: params.fontSize }),
  freehand: (id, pos, params) => createFreehandAnnotation(id, pos, params),
  highlighter: (id, pos, params) => createHighlighterAnnotation(id, pos, params),
};

type AnnotationUpdater = (
  annotation: Annotation,
  pos: { x: number; y: number },
  startPos: { x: number; y: number },
  shiftKey: boolean,
  altKey: boolean,
  pressure: number,
) => Partial<Annotation>;

export const ANNOTATION_UPDATERS: Partial<Record<Annotation["type"], AnnotationUpdater>> = {
  circle: (annotation, pos, startPos, shiftKey, altKey) =>
    updateCircleAnnotation(annotation as CircleAnnotation, pos, startPos, shiftKey, altKey),
  rectangle: (annotation, pos, startPos, shiftKey, altKey) =>
    updateRectangleAnnotation(annotation as RectangleAnnotation, pos, startPos, shiftKey, altKey),
  arrow: (annotation, pos) => updateArrowAnnotation(annotation as ArrowAnnotation, pos),
  freehand: (annotation, pos, _startPos, _shiftKey, _altKey, pressure) =>
    updateFreehandAnnotation(annotation as FreehandAnnotation, pos, pressure),
  highlighter: (annotation, pos) =>
    updateHighlighterAnnotation(annotation as HighlighterAnnotation, pos),
};

export {
  createCircleAnnotation,
  updateCircleAnnotation,
  createRectangleAnnotation,
  updateRectangleAnnotation,
  createArrowAnnotation,
  updateArrowAnnotation,
  createTextAnnotation,
  createFreehandAnnotation,
  updateFreehandAnnotation,
  createHighlighterAnnotation,
  updateHighlighterAnnotation,
};
