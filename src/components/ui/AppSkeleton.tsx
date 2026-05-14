import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function AppSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-ui-sm bg-border", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

