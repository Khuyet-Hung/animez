import type { ReactNode } from "react";
import { AppButton } from "./AppButton";
import { AppDialog } from "./AppDialog";

interface AppAlertDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  destructive?: boolean;
}

export function AppAlertDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isConfirming = false,
  destructive = false,
}: AppAlertDialogProps) {
  return (
    <AppDialog
      open={open}
      titleId="app-alert-dialog-title"
      title={title}
      description={description}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <AppButton type="button" variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </AppButton>
          <AppButton
            type="button"
            variant={destructive ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            isLoading={isConfirming}
          >
            {confirmLabel}
          </AppButton>
        </div>
      }
    >
      <div className="" />
    </AppDialog>
  );
}

