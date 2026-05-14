import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AppTooltipProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
}

export function AppTooltip({ label, children, className, side = "top" }: AppTooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-ui-sm border border-border-strong bg-surface-elevated px-2.5 py-1.5 text-xs font-bold text-fg-soft opacity-0 shadow-panel transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
        )}
      >
        {label}
      </span>
    </span>
  );
}

