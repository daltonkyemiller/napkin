export type BlendMode = "source-over" | "multiply" | "overlay" | "hard-light" | "color-burn";

export interface BaseAnnotation {
  id: string;
  type: "circle" | "rectangle" | "arrow" | "text" | "freehand" | "highlighter";
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: "circle";
  radiusX: number;
  radiusY: number;
  stroke: string;
  strokeWidth: number;
  fill?: string | null;
  sketchiness?: number;
  blendMode?: BlendMode;
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: "rectangle";
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill?: string | null;
  cornerRadius?: number;
  sketchiness?: number;
  blendMode?: BlendMode;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow";
  points: number[];
  stroke: string;
  strokeWidth: number;
  pointerLength?: number;
  pointerWidth?: number;
  bend?: number;
  sketchiness?: number;
  blendMode?: BlendMode;
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  stroke?: string | null;
  strokeWidth?: number;
  width?: number;
  align?: "left" | "center" | "right";
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: "freehand";
  points: [number, number, number][];
  stroke: string;
  strokeWidth: number;
  blendMode?: BlendMode;
}

export interface HighlighterAnnotation extends BaseAnnotation {
  type: "highlighter";
  points: number[];
  stroke: string;
  strokeWidth: number;
  opacity: number;
  tension?: number;
}

export type Annotation =
  | CircleAnnotation
  | RectangleAnnotation
  | ArrowAnnotation
  | TextAnnotation
  | FreehandAnnotation
  | HighlighterAnnotation;

export type AnnotationType = Annotation["type"];

export type Tool = "select" | "ocr" | AnnotationType;

export interface CanvasState {
  width: number;
  height: number;
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
}

export interface SelectionState {
  selectedId: string | null;
  selectedIds: string[];
}

export interface ToolState {
  activeTool: Tool;
  strokeColor: string;
  fillColor: string | null;
  strokeWidth: number;
  fontSize: number;
}
