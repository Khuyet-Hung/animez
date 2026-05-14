import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface AppSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export function AppSelect({ className, hasError = false, ...props }: AppSelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-ui-sm border bg-surface px-3 text-sm font-semibold text-fg outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        hasError ? "border-red-500/50 focus:border-red-400" : "border-border focus:border-brand",
        className
      )}
      {...props}
    />
  );
}

