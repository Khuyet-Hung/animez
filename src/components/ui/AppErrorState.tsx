import type { ReactNode } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { AppButton } from "./AppButton";

interface AppErrorStateProps {
  title: ReactNode;
  description?: ReactNode;
  retryLabel?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function AppErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className,
}: AppErrorStateProps) {
  return (
    <div className={className}>
      <div className="rounded-ui-sm border border-red-500/30 bg-red-500/10 px-5 py-5">
        <div className="flex items-start gap-3">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-red-300" />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-fg">{title}</h2>
            {description && (
              <p className="mt-2 text-sm font-semibold leading-6 text-red-200">
                {description}
              </p>
            )}
            {onRetry && retryLabel && (
              <AppButton
                type="button"
                variant="danger"
                size="sm"
                className="mt-4"
                onClick={onRetry}
              >
                {retryLabel}
              </AppButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

