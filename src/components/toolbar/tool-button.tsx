import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { Icon } from "@/components/ui/icon";
import type { Tool } from "@/types";
import type { IconName } from "@/icons/types";

interface ToolButtonProps {
  value: Tool;
  icon: IconName;
  label: string;
  shortcut: string;
}

export function ToolButton({ value, icon, label, shortcut }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <ToggleGroupItem {...props} value={value}>
            <Icon name={icon} />
          </ToggleGroupItem>
        )}
      />
      <TooltipContent side="bottom">
        {label} <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
