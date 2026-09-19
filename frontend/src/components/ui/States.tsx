import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Lock, RefreshCw, ServerOff, WifiOff } from "lucide-react";
import { cn } from "../../utils/format";
import { Button } from "./Button";

/* --------------------------------------------------------- Skeletons */

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <div
              key={colIndex}
              className="shimmer h-7 rounded-md"
              style={{ width: colIndex === 0 ? "18%" : `${Math.max(9, 22 - colIndex * 2)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MetricGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="panel p-4">
          <div className="shimmer h-2.5 w-24 rounded" />
          <div className="shimmer mt-3 h-7 w-32 rounded" />
          <div className="shimmer mt-3 h-2.5 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex h-full w-full items-end gap-2 px-2 pb-2" style={{ height }}>
      {[38, 62, 45, 78, 56, 88, 66, 72, 50, 84, 60, 70].map((value, index) => (
        <div
          key={index}
          className="shimmer flex-1 rounded-t"
          style={{ height: `${value}%`, animationDelay: `${index * 60}ms` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ States */

export function EmptyState({
  title = "No data available",
  message,
  icon,
  action,
  className,
  compact,
}: {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 text-fog-500">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="mt-3.5 text-[13px] font-semibold text-fog-200">{title}</h3>
      {message ? (
        <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-fog-500">{message}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry,
  retryLabel = "Retry",
  status,
  className,
  compact,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  status?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-loss-500/25 bg-loss-500/10 text-loss-400">
        {status === 0 ? <WifiOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>
      <h3 className="mt-3.5 text-[13px] font-semibold text-fog-200">{title}</h3>
      {message ? (
        <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-fog-500">{message}</p>
      ) : null}
      {status !== undefined ? (
        <span className="mt-2 font-mono text-[10.5px] uppercase tracking-wider text-fog-600">
          HTTP {status === 0 ? "NETWORK" : status}
        </span>
      ) : null}
      {onRetry ? (
        <Button className="mt-4" variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function UnavailableState({
  title = "Not available from the backend",
  message = "This view depends on an endpoint that is not part of the current FastAPI contract. It will activate automatically once the backend exposes it.",
  className,
}: {
  title?: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 text-fog-500">
        <Lock className="h-5 w-5" />
      </div>
      <h3 className="mt-3.5 text-[13px] font-semibold text-fog-200">{title}</h3>
      <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-fog-500">{message}</p>
    </div>
  );
}

export function DisconnectedBanner({
  message,
  onRetry,
  retrying,
}: {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warn-400/25 bg-warn-400/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <ServerOff className="mt-0.5 h-4 w-4 shrink-0 text-warn-400" />
        <div>
          <p className="text-[12px] font-semibold text-warn-400">Backend connection unavailable</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-fog-400">
            {message ??
              "The FastAPI service did not respond. Values on this page are not live and may be shown as simulated sample data."}
          </p>
        </div>
      </div>
      {onRetry ? (
        <Button
          size="sm"
          variant="outline"
          loading={retrying}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={onRetry}
          className="shrink-0 border-warn-400/30 text-warn-400 hover:bg-warn-400/10"
        >
          Retry connection
        </Button>
      ) : null}
    </div>
  );
}
