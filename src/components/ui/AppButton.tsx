import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppSpinner } from "./AppSpinner";

type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link" | "custom";
type AppButtonSize = "sm" | "md" | "lg" | "icon";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClassNames: Record<AppButtonVariant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover",
  secondary: "border border-border bg-surface text-fg hover:border-brand",
  ghost: "text-fg-muted hover:bg-surface hover:text-fg",
  danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-400 hover:text-red-100",
  link: "h-auto px-0 text-brand hover:text-brand-hover",
  custom: "",
};

const sizeClassNames: Record<AppButtonSize, string> = {
  sm: "h-9 rounded-ui-sm px-3 text-xs",
  md: "h-11 rounded-ui-sm px-5 text-sm",
  lg: "h-12 rounded-ui-sm px-6 text-base",
  icon: "size-10 rounded-ui-sm p-0 text-sm",
};

export function AppButton({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClassNames[variant],
        variant !== "link" && sizeClassNames[size],
        variant === "link" && "rounded-ui-xs",
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <AppSpinner /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
