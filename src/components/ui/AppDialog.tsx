import type { HTMLAttributes, ReactNode } from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { AppIconButton } from "./AppIconButton";

interface AppDialogProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  titleId?: string;
  title?: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeLabel?: string;
  closeOnOverlay?: boolean;
}

const sizeClassNames: Record<NonNullable<AppDialogProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "h-full w-full sm:h-[min(92vh,900px)] sm:max-w-5xl",
};

export function AppDialog({
  open,
  titleId,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  closeLabel = "Đóng",
  closeOnOverlay = false,
  className,
  ...props
}: AppDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex max-h-full w-full flex-col overflow-hidden border border-border-strong bg-surface shadow-modal sm:rounded-ui-sm",
          sizeClassNames[size],
          className
        )}
        {...props}
      >
        {(title || description || onClose) && (
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border-strong bg-surface-muted px-4 py-3 sm:px-5">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="truncate text-lg font-black text-fg">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm font-semibold leading-6 text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            {onClose && (
              <AppIconButton aria-label={closeLabel} variant="ghost" size="sm" onClick={onClose}>
                <XIcon className="size-4" />
              </AppIconButton>
            )}
          </header>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <footer className="shrink-0  bg-surface-muted px-4 py-3 sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
