import Color from "color";
import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerAlpha,
} from "@/components/ui/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";

import { STROKE_COLORS } from "@/constants";
import type { Tool } from "@/types";

import {
  IconArrowRightOutlineDuo18,
  IconCursorDefaultOutlineDuo18,
  IconDownload3OutlineDuo18,
  IconPalette2OutlineDuo18,
  IconPenOutlineDuo18,
  IconRedoOutlineDuo18,
  IconScanTextOutlineDuo18,
  IconShapeCircleOutlineDuo18,
  IconShapeSquareOutlineDuo18,
  IconTextHighlight3OutlineDuo18,
  IconTrash2OutlineDuo18,
  IconTypographyOutlineDuo18,
  IconUndoOutlineDuo18,
  IconUpload3OutlineDuo18,
} from "nucleo-ui-outline-duo-18";

interface MainToolbarProps {
  onUploadClick: () => void;
  onDownload: () => void;
}

export function MainToolbar({ onUploadClick, onDownload }: MainToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    selectedIds,
    clearSelection,
  } = useCanvasStore();

  const { annotations, deleteAnnotations, clearAnnotations, updateAnnotation } =
    useAnnotationStore();
  const temporal = useAnnotationStore.temporal;

  const canUndo = temporal.getState().pastStates.length > 0;
  const canRedo = temporal.getState().futureStates.length > 0;

  const handleUndo = () => temporal.getState().undo();
  const handleRedo = () => temporal.getState().redo();

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      deleteAnnotations(selectedIds);
      clearSelection();
    }
  };

  const handleClear = () => {
    clearAnnotations();
    clearSelection();
  };

  const handleStrokeColorChange = (color: string) => {
    setStrokeColor(color);
    if (selectedIds.length > 0) {
      for (const id of selectedIds) {
        const annotation = annotations.find((a) => a.id === id);
        if (annotation) {
          if (annotation.type === "text") {
            updateAnnotation(id, { fill: color });
          } else {
            updateAnnotation(id, { stroke: color });
          }
        }
      }
    }
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    if (selectedIds.length > 0) {
      for (const id of selectedIds) {
        updateAnnotation(id, { strokeWidth: width });
      }
    }
  };

  return (
    <div className="flex shrink-0 items-center justify-center gap-4 border-b bg-background p-3">
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo} title="Undo">
          <IconUndoOutlineDuo18 />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedo} title="Redo">
          <IconRedoOutlineDuo18 />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <ToggleGroup
        value={[activeTool]}
        onValueChange={(value) => {
          const newValue = Array.isArray(value) ? value[0] : value;
          if (newValue) setActiveTool(newValue as Tool);
        }}
      >
        <ToggleGroupItem value="select" title="Select">
          <IconCursorDefaultOutlineDuo18 />
        </ToggleGroupItem>
        <ToggleGroupItem value="circle" title="Circle">
          <IconShapeCircleOutlineDuo18 />
        </ToggleGroupItem>
        <ToggleGroupItem value="rectangle" title="Rectangle">
          <IconShapeSquareOutlineDuo18 />
        </ToggleGroupItem>
        <ToggleGroupItem value="arrow" title="Arrow">
          <IconArrowRightOutlineDuo18 />
        </ToggleGroupItem>
        <ToggleGroupItem value="text" title="Text">
          <IconTypographyOutlineDuo18 />
        </ToggleGroupItem>
        <ToggleGroupItem value="freehand" title="Freehand">
          <IconPenOutlineDuo18 />
        </ToggleGroupItem>
        <ToggleGroupItem value="highlighter" title="Highlighter">
          <IconTextHighlight3OutlineDuo18 />
        </ToggleGroupItem>
        <ToggleGroupItem value="ocr" title="OCR Text Recognition">
          <IconScanTextOutlineDuo18 />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        {STROKE_COLORS.map((color) => (
          <button
            type="button"
            key={color}
            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
              strokeColor === color ? "border-ring ring-2 ring-ring/50" : "border-transparent"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => handleStrokeColorChange(color)}
            title={`Color: ${color}`}
          />
        ))}
        <Popover>
          <PopoverTrigger
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${
              !STROKE_COLORS.includes(strokeColor)
                ? "border-ring ring-2 ring-ring/50"
                : "border-muted-foreground/30 bg-muted"
            }`}
            style={
              !STROKE_COLORS.includes(strokeColor)
                ? { backgroundColor: strokeColor }
                : undefined
            }
            title="Custom color"
          >
            {STROKE_COLORS.includes(strokeColor) && (
              <IconPalette2OutlineDuo18 className="text-muted-foreground" />
            )}
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <ColorPicker
              value={strokeColor}
              onChange={(rgba) => {
                const [r, g, b, a] = rgba as [number, number, number, number];
                const color = a < 1 
                  ? `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
                  : Color.rgb(r, g, b).hex();
                handleStrokeColorChange(color);
              }}
            >
              <ColorPickerSelection className="h-32 rounded-md" />
              <ColorPickerHue />
              <ColorPickerAlpha />
            </ColorPicker>
          </PopoverContent>
        </Popover>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex w-28 items-center gap-2">
        <Slider
          className="flex-1"
          value={[strokeWidth]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            handleStrokeWidthChange(newValue);
          }}
          min={1}
          max={20}
          step={1}
        />
        <span className="w-8 text-xs tabular-nums text-muted-foreground">{strokeWidth}px</span>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onUploadClick} title="Upload Image">
          <IconUpload3OutlineDuo18 />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDownload} title="Download">
          <IconDownload3OutlineDuo18 />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={selectedIds.length === 0}
          title="Delete Selected"
        >
          <IconTrash2OutlineDuo18 />
        </Button>
        <Button variant="destructive" size="sm" onClick={handleClear} title="Clear All">
          Clear
        </Button>
      </div>
    </div>
  );
}
