import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface AppTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export function AppTextarea({ className, hasError = false, ...props }: AppTextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-ui-sm border bg-surface px-3 py-3 text-sm font-medium text-fg outline-none transition-colors placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-60",
        hasError ? "border-red-500/50 focus:border-red-400" : "border-border focus:border-brand",
        className
      )}
      {...props}
    />
  );
}

