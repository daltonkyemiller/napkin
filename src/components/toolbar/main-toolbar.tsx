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
import {
  Circle,
  Square,
  ArrowRight,
  Type,
  Pencil,
  Highlighter,
  MousePointer2,
  Undo,
  Redo,
  Download,
  Trash2,
  Upload,
  ALargeSmall,
  Palette,
} from "lucide-react";
import { STROKE_COLORS } from "@/constants";
import type { Tool, TextAnnotation } from "@/types";

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

  const selectedTextAnnotations = selectedIds
    .map((id) => annotations.find((a) => a.id === id))
    .filter((a): a is TextAnnotation => a?.type === "text");

  const hasSelectedText = selectedTextAnnotations.length > 0;
  const selectedTextHasStroke = selectedTextAnnotations.some(
    (a) => a.stroke && a.strokeWidth && a.strokeWidth > 0,
  );

  const handleToggleTextStroke = () => {
    for (const annotation of selectedTextAnnotations) {
      if (annotation.stroke && annotation.strokeWidth && annotation.strokeWidth > 0) {
        updateAnnotation(annotation.id, { stroke: null, strokeWidth: 0 });
      } else {
        updateAnnotation(annotation.id, {
          stroke: strokeColor,
          strokeWidth: Math.max(1, strokeWidth / 4),
        });
      }
    }
  };

  return (
    <div className="flex shrink-0 items-center justify-center gap-4 border-b bg-background p-3">
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={handleUndo} disabled={!canUndo} title="Undo">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRedo} disabled={!canRedo} title="Redo">
          <Redo className="h-4 w-4" />
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
          <MousePointer2 className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="circle" title="Circle">
          <Circle className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="rectangle" title="Rectangle">
          <Square className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="arrow" title="Arrow">
          <ArrowRight className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="text" title="Text">
          <Type className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="freehand" title="Freehand">
          <Pencil className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="highlighter" title="Highlighter">
          <Highlighter className="h-4 w-4" />
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
                : "border-muted-foreground/30"
            }`}
            style={{
              background: !STROKE_COLORS.includes(strokeColor)
                ? strokeColor
                : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
            }}
            title="Custom color"
          >
            {STROKE_COLORS.includes(strokeColor) && (
              <Palette className="h-3 w-3 text-white drop-shadow-md" />
            )}
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <ColorPicker
              value={strokeColor}
              onChange={(rgba) => {
                const [r, g, b] = rgba as [number, number, number, number];
                const hex = Color.rgb(r, g, b).hex();
                handleStrokeColorChange(hex);
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

      <div className="flex w-24 items-center gap-2">
        <Slider
          value={[strokeWidth]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            handleStrokeWidthChange(newValue);
          }}
          min={1}
          max={20}
          step={1}
        />
        <span className="w-6 text-xs text-muted-foreground">{strokeWidth}px</span>
      </div>

      {hasSelectedText && (
        <>
          <div className="h-6 w-px bg-border" />
          <Button
            variant={selectedTextHasStroke ? "secondary" : "ghost"}
            size="sm"
            onClick={handleToggleTextStroke}
            title={selectedTextHasStroke ? "Remove text outline" : "Add text outline"}
          >
            <ALargeSmall className="h-4 w-4" />
          </Button>
        </>
      )}

      <div className="h-6 w-px bg-border" />

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onUploadClick} title="Upload Image">
          <Upload className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDownload} title="Download">
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={selectedIds.length === 0}
          title="Delete Selected"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" onClick={handleClear} title="Clear All">
          Clear
        </Button>
      </div>
    </div>
  );
}
