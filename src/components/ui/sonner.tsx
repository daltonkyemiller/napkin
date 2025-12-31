import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Icon } from "@/components/ui/icon";
import { useThemeStore } from "@/stores/theme-store";

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeStore((state) => state.mode);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <Icon name="circle-check" size={16} />,
        info: <Icon name="circle-info" size={16} />,
        warning: <Icon name="triangle-warning" size={16} />,
        error: <Icon name="bug" size={16} />,
        loading: <Icon name="loader" size={16} className="animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
