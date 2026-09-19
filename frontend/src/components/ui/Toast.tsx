import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "../../utils/format";
import { useToastStore, type ToastTone } from "../../store/toastStore";

const toneStyles: Record<ToastTone, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: "border-info-500/30 bg-info-500/10 text-info-400" },
  success: { icon: CheckCircle2, classes: "border-gain-500/30 bg-gain-500/10 text-gain-400" },
  warning: { icon: AlertTriangle, classes: "border-warn-400/30 bg-warn-400/10 text-warn-400" },
  error: { icon: XCircle, classes: "border-loss-500/30 bg-loss-500/10 text-loss-400" },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5">
      {toasts.map((toast) => {
        const tone = toneStyles[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              "panel pointer-events-auto flex items-start gap-3 p-3.5 fade-in",
              tone.classes.replace("text-", "border-t-2 border-t-").split(" ")[0],
            )}
            style={{ borderTopWidth: 2 }}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-fog-100">{toast.title}</p>
              {toast.message ? (
                <p className="mt-1 text-[11px] leading-relaxed text-fog-400">{toast.message}</p>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-fog-500 transition-colors hover:text-fog-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
