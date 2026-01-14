import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Kbd } from "@/components/ui/kbd";
import { Icon } from "@/components/ui/icon";
import { ColorPaletteDropdown } from "./color-palette-dropdown";
import { ToolButton } from "./tool-button";
import { useCanvasStore, type StrokeSizePreset } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useBackgroundStore } from "@/stores/background-store";
import type { SaveFormat } from "@/stores/settings-store";
import type { Tool } from "@/types";
import type { IconName } from "@/icons/types";

const TOOL_BUTTONS: { value: Tool; icon: IconName; label: string; shortcut: string }[] = [
  { value: "select", icon: "cursor-default", label: "Select", shortcut: "V" },
  { value: "circle", icon: "shape-circle", label: "Circle", shortcut: "C" },
  { value: "rectangle", icon: "shape-square", label: "Rectangle", shortcut: "R" },
  { value: "arrow", icon: "arrow-right", label: "Arrow", shortcut: "A" },
  { value: "text", icon: "typography", label: "Text", shortcut: "T" },
  { value: "freehand", icon: "pen", label: "Freehand", shortcut: "P" },
  { value: "highlighter", icon: "text-highlight", label: "Highlighter", shortcut: "M" },
  { value: "ocr", icon: "scan-text", label: "OCR Text Recognition", shortcut: "O" },
];

const STROKE_SIZE_OPTIONS: { value: StrokeSizePreset; label: string }[] = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
];

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

interface MainToolbarProps {
  onDownload: (format: SaveFormat) => void;
  onCopyToClipboard: () => void;
  onSettingsClick: () => void;
}

export function MainToolbar({ onDownload, onCopyToClipboard, onSettingsClick }: MainToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    strokeSizePreset,
    setStrokeSizePreset,
    customStrokeWidth,
    setCustomStrokeWidth,
    selectedIds,
    clearSelection,
  } = useCanvasStore();

  const { annotations, deleteAnnotations, clearAnnotations, updateAnnotation } =
    useAnnotationStore();
  const temporal = useAnnotationStore.temporal;
  const { sidebarOpen, toggleSidebar } = useBackgroundStore();

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
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={!canUndo}
              >
                <Icon name="undo" />
              </Button>
            )}
          />
          <TooltipContent side="bottom">
            Undo <Kbd>{modKey}+Z</Kbd>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={!canRedo}
              >
                <Icon name="redo" />
              </Button>
            )}
          />
          <TooltipContent side="bottom">
            Redo <Kbd>{modKey}+⇧+Z</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="h-6 w-px bg-border" />

      <ToggleGroup
        value={[activeTool]}
        onValueChange={(value) => {
          const newValue = Array.isArray(value) ? value[0] : value;
          if (newValue) setActiveTool(newValue as Tool);
        }}
      >
        {TOOL_BUTTONS.map((tool) => (
          <ToolButton key={tool.value} {...tool} />
        ))}
      </ToggleGroup>

      <div className="h-6 w-px bg-border" />

      <ColorPaletteDropdown value={strokeColor} onChange={handleStrokeColorChange} />

      <div className="h-6 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger
          render={(props) => (
            <div {...props} className="flex items-center gap-1">
              <ToggleGroup
                value={[strokeSizePreset]}
                onValueChange={(value) => {
                  const newValue = Array.isArray(value) ? value[0] : value;
                  if (newValue && newValue !== "custom") {
                    setStrokeSizePreset(newValue as StrokeSizePreset);
                  }
                }}
              >
                {STROKE_SIZE_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    size="sm"
                    className="w-8 text-xs font-medium"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Popover>
                <PopoverTrigger
                  render={(triggerProps) => (
                    <Button
                      {...triggerProps}
                      variant={strokeSizePreset === "custom" ? "secondary" : "ghost"}
                      size="sm"
                      className="w-8 text-xs font-medium"
                    >
                      {strokeSizePreset === "custom" ? customStrokeWidth : "#"}
                    </Button>
                  )}
                />
                <PopoverContent align="center" className="w-48 p-3 gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Custom Size</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {customStrokeWidth}px
                    </span>
                  </div>
                  <Slider
                    value={[customStrokeWidth]}
                    onValueChange={(value) => {
                      const newValue = Array.isArray(value) ? value[0] : value;
                      setCustomStrokeWidth(newValue);
                      setStrokeSizePreset("custom");
                      handleStrokeWidthChange(newValue);
                    }}
                    min={1}
                    max={100}
                    step={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        />
        <TooltipContent side="bottom">Stroke Size ({strokeWidth}px)</TooltipContent>
      </Tooltip>

      <div className="h-6 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger
          render={(props) => (
            <Button
              {...props}
              variant={sidebarOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={toggleSidebar}
            >
              <Icon name="frame" />
            </Button>
          )}
        />
        <TooltipContent side="bottom">
          Background <Kbd>B</Kbd>
        </TooltipContent>
      </Tooltip>

      <div className="h-6 w-px bg-border" />

      <div className="flex gap-1">
        <Popover>
          <Tooltip>
            <PopoverTrigger
              render={(props) => (
                <TooltipTrigger
                  {...props}
                  render={(tooltipProps) => (
                    <Button {...tooltipProps} variant="ghost" size="sm">
                      <Icon name="download" />
                      <Icon name="chevron-down" className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                />
              )}
            />
            <TooltipContent side="bottom">
              Save <Kbd>{modKey}+S</Kbd>
            </TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-40 p-1 gap-0">
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => onDownload("png")}
            >
              Save as PNG
            </button>
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => onDownload("jpg")}
            >
              Save as JPG
            </button>
            <div className="h-px bg-border my-1" />
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={onCopyToClipboard}
            >
              Copy to Clipboard
            </button>
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={selectedIds.length === 0}
              >
                <Icon name="trash" />
              </Button>
            )}
          />
          <TooltipContent side="bottom">
            Delete Selected <Kbd>Del</Kbd>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <Button {...props} variant="destructive" size="sm" onClick={handleClear}>
                Clear
              </Button>
            )}
          />
          <TooltipContent side="bottom">Clear All Annotations</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <Button {...props} variant="ghost" size="sm" onClick={onSettingsClick}>
                <Icon name="gear" />
              </Button>
            )}
          />
          <TooltipContent side="bottom">
            Settings <Kbd>{modKey}+,</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
