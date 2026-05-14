import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  hasError?: boolean;
}

export function AppInput({
  className,
  leftIcon,
  rightSlot,
  hasError = false,
  ...props
}: AppInputProps) {
  const inputClassName = cn(
    "h-11 w-full rounded-ui-sm border bg-surface px-4 text-sm text-fg outline-none transition-colors placeholder:text-fg-disabled disabled:cursor-not-allowed disabled:opacity-60",
    leftIcon && "pl-10",
    rightSlot && "pr-10",
    hasError ? "border-red-500/50 focus:border-red-400" : "border-border focus:border-brand",
    className
  );

  if (!leftIcon && !rightSlot) {
    return <input className={inputClassName} {...props} />;
  }

  return (
    <span className="relative block">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-fg-muted">
          {leftIcon}
        </span>
      )}
      <input className={inputClassName} {...props} />
      {rightSlot && (
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2">
          {rightSlot}
        </span>
      )}
    </span>
  );
}

