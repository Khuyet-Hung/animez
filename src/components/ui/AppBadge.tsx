import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type AppBadgeVariant = "brand" | "neutral" | "success" | "warning" | "danger" | "info";

interface AppBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: AppBadgeVariant;
}

const variantClassNames: Record<AppBadgeVariant, string> = {
  brand: "border-brand/35 bg-brand/10 text-brand",
  neutral: "border-border-strong bg-surface-muted text-fg-soft",
  success: "border-green-500/30 bg-green-500/10 text-green-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
};

export function AppBadge({ className, variant = "neutral", ...props }: AppBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-ui-sm border px-2.5 py-1 text-xs font-bold",
        variantClassNames[variant],
        className
      )}
      {...props}
    />
  );
}

