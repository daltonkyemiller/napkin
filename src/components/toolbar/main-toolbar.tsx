import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { Icon } from "@/components/ui/icon";
import { ColorPaletteDropdown } from "./color-palette-dropdown";
import { useCanvasStore } from "@/stores/canvas-store";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useBackgroundStore } from "@/stores/background-store";
import type { Tool } from "@/types";

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const modKey = isMac ? "⌘" : "Ctrl";

interface MainToolbarProps {
  onDownload: () => void;
  onSettingsClick: () => void;
}

export function MainToolbar({ onDownload, onSettingsClick }: MainToolbarProps) {
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
              <Button {...props} variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo}>
                <Icon name="undo" />
              </Button>
            )}
          />
          <TooltipContent side="bottom">
            Undo <Kbd>{modKey}Z</Kbd>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <Button {...props} variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedo}>
                <Icon name="redo" />
              </Button>
            )}
          />
          <TooltipContent side="bottom">
            Redo <Kbd>{modKey}⇧Z</Kbd>
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
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="select">
              <Icon name="cursor-default" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">Select <Kbd>V</Kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="circle">
              <Icon name="shape-circle" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">Circle <Kbd>C</Kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="rectangle">
              <Icon name="shape-square" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">Rectangle <Kbd>R</Kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="arrow">
              <Icon name="arrow-right" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">Arrow <Kbd>A</Kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="text">
              <Icon name="typography" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">Text <Kbd>T</Kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="freehand">
              <Icon name="pen" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">Freehand <Kbd>P</Kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="highlighter">
              <Icon name="text-highlight" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">Highlighter <Kbd>M</Kbd></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={(props) => (
            <ToggleGroupItem {...props} value="ocr">
              <Icon name="scan-text" />
            </ToggleGroupItem>
          )} />
          <TooltipContent side="bottom">OCR Text Recognition <Kbd>O</Kbd></TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <div className="h-6 w-px bg-border" />

      <ColorPaletteDropdown value={strokeColor} onChange={handleStrokeColorChange} />

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
        <Tooltip>
          <TooltipTrigger
            render={(props) => (
              <Button {...props} variant="ghost" size="sm" onClick={onDownload}>
                <Icon name="download" />
              </Button>
            )}
          />
          <TooltipContent side="bottom">
            Save <Kbd>{modKey}S</Kbd>
          </TooltipContent>
        </Tooltip>
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
            Settings <Kbd>{modKey},</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
