"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface Toast extends Required<Pick<ToastInput, "title" | "variant">> {
  id: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION = 4200;

const TOAST_VARIANT_STYLES: Record<
  ToastVariant,
  {
    icon: LucideIcon;
    iconClassName: string;
    progressClassName: string;
    role: "status" | "alert";
  }
> = {
  success: {
    icon: CheckCircle2Icon,
    iconClassName: "border-green-500/35 bg-green-500/10 text-green-400",
    progressClassName: "bg-green-500",
    role: "status",
  },
  error: {
    icon: AlertCircleIcon,
    iconClassName: "border-red-500/35 bg-red-500/10 text-red-400",
    progressClassName: "bg-red-500",
    role: "alert",
  },
  info: {
    icon: InfoIcon,
    iconClassName: "border-blue-400/35 bg-blue-400/10 text-blue-300",
    progressClassName: "bg-blue-400",
    role: "status",
  },
  warning: {
    icon: AlertTriangleIcon,
    iconClassName: "border-brand/35 bg-brand/10 text-brand",
    progressClassName: "bg-brand",
    role: "alert",
  },
};

function createToastId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const ToastItem = memo(function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const variantStyle = TOAST_VARIANT_STYLES[toast.variant];
  const ToastIcon = variantStyle.icon;

  return (
    <div
      role={variantStyle.role}
      className="pointer-events-auto grid grid-cols-[auto_1fr_auto] gap-3 overflow-hidden rounded-ui-sm border border-border-strong bg-surface/95 p-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur animate-[toast-pop_180ms_ease-out]"
    >
      <div className={`flex size-9 items-center justify-center rounded-ui-pill border ${variantStyle.iconClassName}`}>
        <ToastIcon className="size-4" />
      </div>

      <div className="min-w-0 self-center">
        <p className="text-sm font-black leading-tight text-fg">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs font-semibold leading-5 text-fg-muted">{toast.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex size-8 items-center justify-center rounded-ui-sm border border-transparent text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        aria-label="Đóng thông báo"
      >
        <XIcon className="size-4" />
      </button>

      <div className="col-span-3 h-px overflow-hidden bg-border">
        <div
          className={`h-full w-full origin-left animate-[toast-progress_4200ms_linear_forwards] ${variantStyle.progressClassName}`}
        />
      </div>
    </div>
  );
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIds = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timeoutId = timeoutIds.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIds.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = "success" }: ToastInput) => {
      const id = createToastId();
      setToasts((current) => [...current.slice(-2), { id, title, description, variant }]);

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION);
      timeoutIds.current.set(id, timeoutId);
    },
    [dismissToast]
  );

  useEffect(() => {
    const activeTimeoutIds = timeoutIds.current;

    return () => {
      activeTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      activeTimeoutIds.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions removals"
        className="fixed inset-x-3 top-3 z-[130] grid gap-3 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[360px]"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
