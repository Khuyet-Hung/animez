import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppPanel } from "./AppPanel";

interface AppEmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function AppEmptyState({ title, description, icon, action, className }: AppEmptyStateProps) {
  return (
    <AppPanel
      variant="default"
      className={cn("flex flex-col items-center px-5 py-10 text-center", className)}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-ui-pill border border-border-strong bg-surface-muted text-brand">
          {icon}
        </div>
      )}
      {title && <p className="text-sm font-black text-fg">{title}</p>}
      {description && (
        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-fg-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </AppPanel>
  );
}

