import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppSpinner } from "./AppSpinner";

type AppIconButtonVariant = "default" | "ghost" | "brand" | "danger";
type AppIconButtonSize = "sm" | "md" | "lg";

interface AppIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: AppIconButtonVariant;
  size?: AppIconButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClassNames: Record<AppIconButtonVariant, string> = {
  default: "border border-border-strong text-fg-soft hover:border-brand hover:text-fg",
  ghost: "text-fg-muted hover:bg-surface hover:text-fg",
  brand: "border border-brand/40 bg-brand/10 text-brand hover:border-brand hover:bg-brand/20 hover:text-fg",
  danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-400 hover:text-red-100",
};

const sizeClassNames: Record<AppIconButtonSize, string> = {
  sm: "size-8 rounded-ui-sm",
  md: "size-10 rounded-ui-sm",
  lg: "size-11 rounded-ui-pill",
};

export function AppIconButton({
  className,
  variant = "default",
  size = "md",
  isLoading = false,
  children,
  disabled,
  ...props
}: AppIconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClassNames[variant],
        sizeClassNames[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <AppSpinner /> : children}
    </button>
  );
}

