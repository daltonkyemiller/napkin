export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "frame"
  | "image-plus"
  | "bug"
  | "check"
  | "chevron-down"
  | "chevron-up"
  | "circle-check"
  | "circle-info"
  | "clipboard"
  | "cursor-default"
  | "download"
  | "folder"
  | "gear"
  | "loader"
  | "paintbrush"
  | "palette"
  | "pen"
  | "redo"
  | "scan-text"
  | "shape-circle"
  | "shape-square"
  | "square-xmark"
  | "text-highlight"
  | "trash"
  | "triangle-warning"
  | "typography"
  | "undo"
  | "xmark";

export const ICON_NAMES: IconName[] = [
  "arrow-left",
  "arrow-right",
  "frame",
  "image-plus",
  "bug",
  "check",
  "chevron-down",
  "chevron-up",
  "circle-check",
  "circle-info",
  "clipboard",
  "cursor-default",
  "download",
  "folder",
  "gear",
  "loader",
  "paintbrush",
  "palette",
  "pen",
  "redo",
  "scan-text",
  "shape-circle",
  "shape-square",
  "square-xmark",
  "text-highlight",
  "trash",
  "triangle-warning",
  "typography",
  "undo",
  "xmark",
];

export type IconMapping = Partial<Record<IconName, string | null>>;
