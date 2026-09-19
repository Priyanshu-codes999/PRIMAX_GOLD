import type { ReactNode } from "react";
import { Activity, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { cn, formatLatency, formatTimestamp, timeAgo } from "../../utils/format";

export type IndicatorStatus =
  | "connected"
  | "connecting"
  | "degraded"
  | "disconnected"
  | "error"
  | "unavailable"
  | "unknown";

const statusConfig: Record<
  IndicatorStatus,
  { dot: string; text: string; label: string; pulse?: boolean }
> = {
  connected: { dot: "bg-gain-400", text: "text-gain-400", label: "Connected" },
  connecting: { dot: "bg-info-400", text: "text-info-400", label: "Connecting", pulse: true },
  degraded: { dot: "bg-warn-400", text: "text-warn-400", label: "Degraded", pulse: true },
  disconnected: { dot: "bg-fog-500", text: "text-fog-400", label: "Disconnected" },
  error: { dot: "bg-loss-400", text: "text-loss-400", label: "Error" },
  unavailable: { dot: "bg-fog-600", text: "text-fog-500", label: "Unavailable" },
  unknown: { dot: "bg-fog-500", text: "text-fog-500", label: "Unknown" },
};

export function ConnectionIndicator({
  status,
  label,
  latencyMs,
  compact = false,
  className,
  icon,
}: {
  status: IndicatorStatus;
  label: string;
  latencyMs?: number | null;
  compact?: boolean;
  className?: string;
  icon?: ReactNode;
}) {
  const config = statusConfig[status] ?? statusConfig.unknown;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-ink-700/80 bg-ink-880/80",
        compact ? "px-2 py-1" : "px-2.5 py-1.5",
        className,
      )}
      title={`${label}: ${config.label}`}
    >
      {icon ?? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", config.dot, config.pulse && "animate-ping")}
          />
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dot)} />
        </span>
      )}
      <span className={cn("text-[10px] font-semibold uppercase tracking-[0.11em]", config.text)}>
        {compact ? config.label : label}
      </span>
      {!compact && (
        <span className="text-[10px] text-fog-500">
          · {config.label}
          {latencyMs !== null && latencyMs !== undefined ? ` · ${formatLatency(latencyMs, "ms")}` : ""}
        </span>
      )}
    </div>
  );
}

export function StatusTile({
  title,
  status,
  detail,
  latencyMs,
  lastUpdate,
  icon,
  onRefresh,
  refreshing,
}: {
  title: string;
  status: IndicatorStatus;
  detail?: string;
  latencyMs?: number | null;
  lastUpdate?: string | number | null;
  icon?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const config = statusConfig[status] ?? statusConfig.unknown;
  return (
    <div className="panel flex items-start justify-between gap-3 p-3.5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border",
            status === "connected"
              ? "border-gain-500/25 bg-gain-500/10 text-gain-400"
              : status === "error"
                ? "border-loss-500/25 bg-loss-500/10 text-loss-400"
                : status === "degraded"
                  ? "border-warn-400/25 bg-warn-400/10 text-warn-400"
                  : "border-ink-700 bg-ink-800 text-fog-400",
          )}
        >
          {icon ?? (status === "disconnected" ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />)}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-fog-300">{title}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            <span className={cn("text-[11px] font-medium", config.text)}>{config.label}</span>
            {latencyMs !== null && latencyMs !== undefined ? (
              <span className="font-mono text-[10.5px] text-fog-500">{formatLatency(latencyMs, "ms")}</span>
            ) : null}
          </div>
          {detail ? <p className="mt-1 text-[10.5px] text-fog-500">{detail}</p> : null}
          {lastUpdate ? (
            <p className="mt-0.5 font-mono text-[10px] text-fog-600">
              Last check {typeof lastUpdate === "number" ? timeAgo(lastUpdate) : formatTimestamp(lastUpdate)}
            </p>
          ) : null}
        </div>
      </div>
      {onRefresh ? (
        <button
          onClick={onRefresh}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-700 text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-200"
          aria-label={`Refresh ${title}`}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>
      ) : null}
    </div>
  );
}

export function Disclosure({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-ink-700/70 py-6", className)}>
      <div className="flex flex-col gap-2.5 text-[10.5px] leading-relaxed text-fog-600 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-400/60" />
          <p className="max-w-3xl">
            PRIMAX GOLD is currently operating in a paper-trading and research environment. Past simulation
            results do not guarantee future performance. Trading signals are experimental and should not be
            interpreted as financial advice.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-fog-600">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> TERMINAL v1.0
          </span>
          <span>© {new Date().getFullYear()} PRIMAX GOLD</span>
        </div>
      </div>
    </footer>
  );
}
