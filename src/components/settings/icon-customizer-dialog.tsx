import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  NestedDialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useIconStore } from "@/stores/icon-store";
import { ICON_NAMES, type IconName } from "@/icons/types";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface DirectoryIcon {
  path: string;
  name: string;
}

interface IconCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalizeSvgForDisplay(svg: string, size: number): string {
  let result = svg
    .replace(/<svg([^>]*)\swidth="[^"]*"/g, `<svg$1 width="${size}"`)
    .replace(/<svg([^>]*)\sheight="[^"]*"/g, `<svg$1 height="${size}"`)
    .replace(/stroke="black"/gi, 'stroke="currentColor"')
    .replace(/stroke="#000000"/gi, 'stroke="currentColor"')
    .replace(/stroke="#000"/gi, 'stroke="currentColor"')
    .replace(/fill="black"/gi, 'fill="currentColor"')
    .replace(/fill="#000000"/gi, 'fill="currentColor"')
    .replace(/fill="#000"/gi, 'fill="currentColor"');
  
  if (!result.includes('fill=')) {
    result = result.replace(/<svg/, '<svg fill="currentColor"');
  }
  
  return result;
}

function SvgPreview({ svg, size }: { svg: string; size: number }) {
  const normalized = normalizeSvgForDisplay(svg, size);
  return (
    <span
      className="inline-flex shrink-0 text-foreground"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: normalized }}
    />
  );
}

function LazyIconPreview({
  path,
  size,
  previewCache,
  onLoadPreview,
}: {
  path: string;
  size: number;
  previewCache: Record<string, string>;
  onLoadPreview: (path: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !previewCache[path]) {
      onLoadPreview(path);
    }
  }, [isVisible, path, previewCache, onLoadPreview]);

  const preview = previewCache[path];

  return (
    <div
      ref={ref}
      className="flex items-center justify-center rounded bg-muted"
      style={{ width: size + 16, height: size + 16 }}
    >
      {preview ? (
        <SvgPreview svg={preview} size={size} />
      ) : (
        <span className="text-xs text-muted-foreground">...</span>
      )}
    </div>
  );
}

export function IconCustomizerDialog({ open: isOpen, onOpenChange }: IconCustomizerDialogProps) {
  const { iconMapping, setIconPath, resetToDefaults } = useIconStore();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string | null>>({});
  const [directoryPath, setDirectoryPath] = useState<string | null>(null);
  const [directoryIcons, setDirectoryIcons] = useState<DirectoryIcon[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<IconName | null>(null);
  const [search, setSearch] = useState("");
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setPendingChanges({});
      setSelectedIcon(null);
      setSearch("");
    }
  }, [isOpen]);

  const handleSelectDirectory = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select icon directory",
    });

    if (!selected || typeof selected !== "string") return;

    setDirectoryPath(selected);
    setLoadingDirectory(true);
    setDirectoryIcons([]);
    setPreviewCache({});

    try {
      const svgFiles = await invoke<string[]>("scan_icon_directory", { dirPath: selected });
      const icons: DirectoryIcon[] = svgFiles.map((path) => {
        const filename = path.split("/").pop() ?? "";
        const name = filename.replace(/^\d+px_/, "").replace(".svg", "");
        return { path, name };
      });
      setDirectoryIcons(icons);
    } catch (error) {
      console.error("Failed to scan directory:", error);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const loadPreview = useCallback(async (path: string) => {
    if (previewCache[path]) return;
    try {
      const svg = await invoke<string>("load_svg_file", { filePath: path });
      setPreviewCache((prev) => ({ ...prev, [path]: svg }));
    } catch (error) {
      console.error("Failed to load preview:", error);
    }
  }, [previewCache]);

  useEffect(() => {
    for (const [, path] of Object.entries(pendingChanges)) {
      if (path && !previewCache[path]) {
        loadPreview(path);
      }
    }
  }, [pendingChanges, previewCache, loadPreview]);

  const filteredDirectoryIcons = useMemo(() => {
    if (!search) return directoryIcons;
    const lower = search.toLowerCase();
    return directoryIcons.filter((icon) => icon.name.toLowerCase().includes(lower));
  }, [directoryIcons, search]);

  const handleAssign = (dirIcon: DirectoryIcon) => {
    if (!selectedIcon) return;
    setPendingChanges((prev) => ({ ...prev, [selectedIcon]: dirIcon.path }));
    loadPreview(dirIcon.path);
    setSelectedIcon(null);
  };

  const handleClear = (iconName: IconName) => {
    setPendingChanges((prev) => ({ ...prev, [iconName]: null }));
  };

  const handleApply = async () => {
    const changes = Object.entries(pendingChanges);
    if (changes.length === 0) {
      onOpenChange(false);
      return;
    }

    for (const [iconName, path] of changes) {
      await setIconPath(iconName as IconName, path);
    }

    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetToDefaults();
    setPendingChanges({});
    onOpenChange(false);
  };

  const getEffectiveMapping = (iconName: IconName): string | null => {
    if (iconName in pendingChanges) {
      return pendingChanges[iconName] ?? null;
    }
    return iconMapping[iconName] ?? null;
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const renderCurrentIcon = (iconName: IconName) => {
    const pendingPath = pendingChanges[iconName];
    
    if (pendingPath && previewCache[pendingPath]) {
      return <SvgPreview svg={previewCache[pendingPath]} size={18} />;
    }
    
    if (pendingPath === null) {
      return <Icon name={iconName} />;
    }
    
    return <Icon name={iconName} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <NestedDialogContent showCloseButton={false} className="h-[40rem] w-[56rem] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>Customize Icons</DialogTitle>
          <DialogDescription>
            Select an icon on the left, then click an icon from the directory to assign it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 gap-4">
          <div className="flex flex-col w-1/2 min-h-0">
            <div className="text-sm font-medium mb-2">Current Icons</div>
            <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
              <div className="divide-y">
                {ICON_NAMES.map((iconName) => {
                  const customPath = getEffectiveMapping(iconName);
                  const isPending = iconName in pendingChanges;
                  const isSelected = selectedIcon === iconName;

                  return (
                    <button
                      type="button"
                      key={iconName}
                      onClick={() => setSelectedIcon(isSelected ? null : iconName)}
                      className={cn(
                        "flex items-center gap-3 p-2 w-full text-left hover:bg-muted/50 transition-colors",
                        isSelected && "bg-primary/10 ring-2 ring-primary ring-inset"
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
                        {renderCurrentIcon(iconName)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium">{iconName}</span>
                        {customPath ? (
                          <span
                            className={cn(
                              "text-xs truncate",
                              isPending ? "text-primary" : "text-muted-foreground"
                            )}
                            title={customPath}
                          >
                            {customPath.split("/").pop()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Default (Lucide)</span>
                        )}
                      </div>
                      {customPath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClear(iconName);
                          }}
                          className="shrink-0"
                        >
                          Reset
                        </Button>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col w-1/2 min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Available Icons</span>
              <Button variant="outline" size="sm" onClick={handleSelectDirectory} className="ml-auto">
                <Icon name="folder" size={16} />
                {directoryPath ? "Change" : "Select"} Directory
              </Button>
            </div>

            {directoryPath && (
              <Input
                placeholder="Search icons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2"
              />
            )}

            <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
              {!directoryPath ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                  Select a directory containing SVG icons to browse available icons.
                </div>
              ) : loadingDirectory ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <Icon name="loader" className="animate-spin mr-2" />
                  Scanning directory...
                </div>
              ) : filteredDirectoryIcons.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                  {search ? "No icons match your search." : "No SVG files found in this directory."}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-2">
                  {filteredDirectoryIcons.map((dirIcon) => (
                    <button
                      type="button"
                      key={dirIcon.path}
                      onClick={() => handleAssign(dirIcon)}
                      disabled={!selectedIcon}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded hover:bg-muted/50 transition-colors",
                        selectedIcon ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                      )}
                      title={dirIcon.name}
                    >
                      <LazyIconPreview
                        path={dirIcon.path}
                        size={24}
                        previewCache={previewCache}
                        onLoadPreview={loadPreview}
                      />
                      <span className="text-xs text-muted-foreground truncate w-full text-center">
                        {dirIcon.name.length > 14 ? `${dirIcon.name.slice(0, 14)}...` : dirIcon.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {directoryPath && (
              <div className="text-xs text-muted-foreground mt-2 truncate" title={directoryPath}>
                {directoryIcons.length} icons from: {directoryPath}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset All to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!hasChanges}>
              Apply Changes
            </Button>
          </div>
        </div>
      </NestedDialogContent>
    </Dialog>
  );
}
