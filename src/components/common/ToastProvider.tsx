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
import { CheckCircle2Icon, XIcon } from "lucide-react";

type ToastVariant = "success";

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
  return (
    <div
      role="status"
      className="pointer-events-auto grid grid-cols-[auto_1fr_auto] gap-3 overflow-hidden rounded-lg border border-[#2a2a35] bg-[#111118]/95 p-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur animate-[toast-pop_180ms_ease-out]"
    >
      <div className="flex size-9 items-center justify-center rounded-full border border-[#f49e0b]/35 bg-[#f49e0b]/10 text-[#f49e0b]">
        <CheckCircle2Icon className="size-4" />
      </div>

      <div className="min-w-0 self-center">
        <p className="text-sm font-black leading-tight text-white">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs font-semibold leading-5 text-[#9ca3af]">{toast.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex size-8 items-center justify-center rounded border border-transparent text-[#9ca3af] transition-colors hover:border-[#2a2a35] hover:text-white"
        aria-label="Đóng thông báo"
      >
        <XIcon className="size-4" />
      </button>

      <div className="col-span-3 h-px overflow-hidden bg-[#1a1a24]">
        <div className="h-full w-full origin-left bg-[#f49e0b] animate-[toast-progress_4200ms_linear_forwards]" />
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
