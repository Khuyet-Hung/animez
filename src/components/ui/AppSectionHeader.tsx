import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AppSectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function AppSectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  ...props
}: AppSectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)} {...props}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-black uppercase tracking-normal text-brand">{eyebrow}</p>
        )}
        <h2 className="mt-1 text-2xl font-black leading-tight text-fg">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-fg-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
