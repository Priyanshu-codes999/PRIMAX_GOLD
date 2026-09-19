import type { ReactNode } from "react";
import { cn, formatCurrency, formatNumber, formatPercent, formatSignedPercent, toNumber } from "../../utils/format";
import { Badge } from "./Button";

/* ----------------------------------------------------------- MetricCard */

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  deltaMode?: "value" | "percent";
  icon?: ReactNode;
  hint?: string;
  tone?: "default" | "gain" | "loss" | "gold";
  loading?: boolean;
  footer?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  delta,
  deltaLabel,
  deltaMode = "percent",
  icon,
  hint,
  tone = "default",
  loading,
  footer,
  className,
}: MetricCardProps) {
  const deltaValue = toNumber(delta);
  const isPositive = (deltaValue ?? 0) >= 0;

  return (
    <div
      className={cn(
        "panel relative flex flex-col justify-between overflow-hidden p-4",
        tone === "gold" && "border-gold-400/20",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fog-500">
            {label}
          </p>
          {loading ? (
            <div className="shimmer mt-2.5 h-7 w-28 rounded" />
          ) : (
            <p
              className={cn(
                "tabular mt-2 truncate font-mono text-[22px] font-medium leading-none",
                tone === "gain" && "text-gain-400",
                tone === "loss" && "text-loss-400",
                tone === "gold" && "text-gold-300",
                tone === "default" && "text-fog-100",
              )}
            >
              {value}
            </p>
          )}
          {subValue ? (
            <div className="mt-1.5 truncate text-[11px] text-fog-500">{subValue}</div>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700 bg-ink-800 text-fog-500">
            {icon}
          </div>
        ) : null}
      </div>

      {(deltaValue !== null || footer || hint) && (
        <div className="mt-3 flex items-center gap-2 border-t border-ink-700/70 pt-2.5">
          {deltaValue !== null ? (
            <span
              className={cn(
                "tabular font-mono text-[11px] font-medium",
                isPositive ? "text-gain-400" : "text-loss-400",
              )}
            >
              {deltaMode === "percent"
                ? formatSignedPercent(deltaValue)
                : formatCurrency(deltaValue, 2, { sign: true })}
            </span>
          ) : null}
          {deltaLabel ? <span className="text-[11px] text-fog-500">{deltaLabel}</span> : null}
          {footer ? <div className="ml-auto text-[11px] text-fog-500">{footer}</div> : null}
          {hint ? <span className="ml-auto text-[10.5px] text-fog-600">{hint}</span> : null}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- PnL helpers */

export function PnLIndicator({
  value,
  currency = true,
  decimals = 2,
  suffix,
  size = "md",
  showSign = true,
}: {
  value: number | null | undefined;
  currency?: boolean;
  decimals?: number;
  suffix?: string;
  size?: "sm" | "md" | "lg";
  showSign?: boolean;
}) {
  const num = toNumber(value);
  const tone = num === null || num === 0 ? "text-fog-300" : num > 0 ? "text-gain-400" : "text-loss-400";
  return (
    <span
      className={cn(
        "tabular font-mono font-medium",
        tone,
        size === "sm" && "text-[11px]",
        size === "md" && "text-[13px]",
        size === "lg" && "text-[17px]",
      )}
    >
      {num === null
        ? "—"
        : `${showSign && num > 0 ? "+" : ""}${
            currency
              ? formatCurrency(num, decimals)
              : formatNumber(num, decimals)
          }${suffix ?? ""}`}
    </span>
  );
}

export function PercentIndicator({ value, decimals = 2 }: { value: number | null | undefined; decimals?: number }) {
  const num = toNumber(value);
  return (
    <span
      className={cn(
        "tabular font-mono text-[12px] font-medium",
        num === null || num === 0 ? "text-fog-300" : num > 0 ? "text-gain-400" : "text-loss-400",
      )}
    >
      {num === null ? "—" : formatPercent(num, decimals, { alreadyDecimal: Math.abs(num) <= 100 })}
    </span>
  );
}

/* --------------------------------------------------------------- Badges */

export function StatusBadge({ status, size = "md" }: { status?: string | null; size?: "sm" | "md" }) {
  const value = (status ?? "unknown").toUpperCase();
  let tone: "neutral" | "gain" | "loss" | "info" | "warn" | "gold" = "neutral";

  if (["HEALTHY", "ONLINE", "CONNECTED", "ACTIVE", "LIVE", "OK", "RUNNING", "SUCCESS", "ENABLED"].includes(value))
    tone = "gain";
  else if (["ERROR", "FAILED", "DOWN", "HALTED", "DISABLED", "REJECTED", "CRITICAL"].includes(value))
    tone = "loss";
  else if (["WARNING", "DEGRADED", "PARTIAL", "PENDING", "PARTIALLY_FILLED", "MAINTENANCE"].includes(value))
    tone = "warn";
  else if (["CONNECTING", "SYNCING", "PROCESSING", "QUEUED", "NEW", "SUBMITTED"].includes(value))
    tone = "info";
  else if (["PAPER", "SIMULATED", "SIMULATION", "PAPER_TRADING", "PREVIEW"].includes(value)) tone = "gold";

  return (
    <Badge tone={tone} size={size}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "gain" && "bg-gain-400",
          tone === "loss" && "bg-loss-400",
          tone === "warn" && "bg-warn-400",
          tone === "info" && "bg-info-400",
          tone === "gold" && "bg-gold-400",
          tone === "neutral" && "bg-fog-500",
        )}
      />
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status?: string | null }) {
  return <StatusBadge status={status} size="sm" />;
}

export function SideBadge({ side, size = "sm" }: { side?: string | null; size?: "sm" | "md" }) {
  const value = (side ?? "").toUpperCase();
  const isBuy = value === "BUY" || value === "LONG";
  const isSell = value === "SELL" || value === "SHORT";
  return (
    <Badge tone={isBuy ? "gain" : isSell ? "loss" : "neutral"} size={size}>
      {value || "—"}
    </Badge>
  );
}

export function DataModeBadge({ mode }: { mode: "api" | "preview" }) {
  return mode === "api" ? (
    <Badge tone="gain" size="sm">
      BACKEND
    </Badge>
  ) : (
    <Badge tone="warn" size="sm">
      SIMULATED
    </Badge>
  );
}
