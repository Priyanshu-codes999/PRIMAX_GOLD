import type { ReactNode } from "react";
import { cn } from "../../utils/format";
import { ChartSkeleton, EmptyState, ErrorState } from "./States";

export function ChartCard({
  title,
  subtitle,
  actions,
  badge,
  children,
  height = 280,
  loading,
  error,
  errorStatus,
  onRetry,
  empty,
  emptyTitle = "No chart data",
  emptyMessage = "Historical data has not been provided by the backend yet.",
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  height?: number;
  loading?: boolean;
  error?: string | null;
  errorStatus?: number;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-ink-700/70 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-fog-300">{title}</h3>
            {badge}
          </div>
          {subtitle ? <p className="mt-1 text-[11px] leading-relaxed text-fog-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn("relative flex-1 px-2 py-3", bodyClassName)} style={{ minHeight: height }}>
        {loading ? (
          <ChartSkeleton height={height} />
        ) : error ? (
          <ErrorState
            compact
            title="Chart unavailable"
            message={error}
            status={errorStatus}
            onRetry={onRetry}
          />
        ) : empty ? (
          <EmptyState compact title={emptyTitle} message={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  stroke?: string;
  fill?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Shared Recharts tooltip with terminal styling. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: unknown;
  formatter?: (value: unknown, name: string) => string;
  labelFormatter?: (label: unknown) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-650 bg-ink-900/95 px-3 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.85)] backdrop-blur-sm">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-fog-500">
        {labelFormatter ? labelFormatter(label) : String(label ?? "")}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: entry.color || entry.stroke || entry.fill || "#cfa95c" }}
            />
            <span className="text-[10.5px] text-fog-400">{String(entry.name ?? entry.dataKey ?? "")}</span>
            <span className="ml-auto font-mono text-[11px] text-fog-100">
              {formatter ? formatter(entry.value, String(entry.name ?? "")) : String(entry.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CHART_COLORS = {
  gold: "#cfa95c",
  goldSoft: "rgba(207,169,92,0.18)",
  gain: "#34d399",
  gainSoft: "rgba(52,211,153,0.16)",
  loss: "#f87171",
  lossSoft: "rgba(248,113,113,0.16)",
  info: "#60a5fa",
  infoSoft: "rgba(96,165,250,0.16)",
  neutral: "#8d99a6",
  grid: "rgba(255,255,255,0.055)",
  tick: "#6c7885",
} as const;

export const CHART_AXIS = {
  stroke: "rgba(255,255,255,0.07)",
  tick: {
    fill: CHART_COLORS.tick,
    fontSize: 10,
    fontFamily: "JetBrains Mono, monospace",
  },
} as const;
