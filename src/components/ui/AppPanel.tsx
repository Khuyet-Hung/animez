import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type AppPanelVariant = "default" | "muted" | "elevated" | "interactive";

interface AppPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AppPanelVariant;
}

const variantClassNames: Record<AppPanelVariant, string> = {
  default: "border-border bg-surface",
  muted: "border-border bg-bg-muted",
  elevated: "border-border-strong bg-surface shadow-panel",
  interactive: "border-border bg-surface transition-colors hover:border-brand",
};

export function AppPanel({ className, variant = "default", ...props }: AppPanelProps) {
  return (
    <div
      className={cn("rounded-ui-sm border", variantClassNames[variant], className)}
      {...props}
    />
  );
}

