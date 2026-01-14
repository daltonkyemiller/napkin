import { Button } from "@/components/ui/button";

interface BooleanToggleSettingProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanToggleSetting({
  label,
  description,
  value,
  onChange,
}: BooleanToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Button
        variant={value ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(!value)}
      >
        {value ? "On" : "Off"}
      </Button>
    </div>
  );
}
