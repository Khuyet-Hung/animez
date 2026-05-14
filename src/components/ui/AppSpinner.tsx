import { cn } from "@/lib/cn";

interface AppSpinnerProps {
  className?: string;
}

export function AppSpinner({ className }: AppSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 rounded-ui-pill border-2 border-current/30 border-t-current animate-spin",
        className
      )}
    />
  );
}

