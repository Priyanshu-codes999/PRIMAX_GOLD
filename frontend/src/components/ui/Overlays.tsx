import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "../../utils/format";
import { Button } from "./Button";

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[80] transition-opacity duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col border-l border-ink-700 bg-ink-880 shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.75)]",
          "transition-transform duration-250 ease-out",
          width,
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-fog-100">{title}</div>
            {subtitle ? <div className="mt-1 text-[11.5px] text-fog-500">{subtitle}</div> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 text-fog-400 transition-colors hover:bg-ink-800 hover:text-fog-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-ink-700 px-5 py-3.5">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="panel relative w-full max-w-md p-5 fade-in">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              danger
                ? "border-loss-500/30 bg-loss-500/12 text-loss-400"
                : "border-gold-400/25 bg-gold-400/10 text-gold-300",
            )}
          >
            {danger ? <AlertTriangle className="h-4.5 w-4.5" /> : <Check className="h-4.5 w-4.5" />}
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-fog-100">{title}</h3>
            <div className="mt-1.5 text-[12px] leading-relaxed text-fog-400">{message}</div>
            {children}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
