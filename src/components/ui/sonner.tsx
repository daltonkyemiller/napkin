import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  IconCircleHalfDottedCheckOutlineDuo18,
  IconCircleInfoOutlineDuo18,
  IconTriangleWarningOutlineDuo18,
  IconLoaderOutlineDuo18,
  IconBugOutlineDuo18,
} from "nucleo-ui-outline-duo-18";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <IconCircleHalfDottedCheckOutlineDuo18 className="size-4" />,
        info: <IconCircleInfoOutlineDuo18 className="size-4" />,
        warning: <IconTriangleWarningOutlineDuo18 className="size-4" />,
        error: <IconBugOutlineDuo18 className="size-4" />,
        loading: <IconLoaderOutlineDuo18 className="size-4 animate-spin" />,
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
