import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Gauge,
  Server,
  Ban,
  Info,
} from "lucide-react";

import {
  Panel,
  SectionHeader,
  KeyValueRow,
} from "../components/ui/Layout";

import { Badge, Button } from "../components/ui/Button";
import {
  MetricCard,
  StatusBadge,
} from "../components/ui/Indicators";

import {
  getOrders,
  getPositions,
} from "../services/backend";

import {
  useRefreshInterval,
  useSourcedResource,
} from "../hooks/useBackend";

import {
  previewOrders,
  previewPositions,
} from "../services/previewData";

import {
  cn,
  formatNumber,
  toNumber,
} from "../utils/format";

/* =========================================================
   TYPES
========================================================= */

type RiskState =
  | "SAFE"
  | "WARNING"
  | "BLOCKED";

interface RiskLimit {
  label: string;
  current: number;
  limit: number;
  unit: string;
  description: string;
}

/* =========================================================
   HELPERS
========================================================= */

function riskState(
  current: number,
  limit: number,
): RiskState {
  if (limit <= 0) return "BLOCKED";

  const ratio = Math.abs(current) / limit;

  if (ratio >= 1) return "BLOCKED";
  if (ratio >= 0.8) return "WARNING";

  return "SAFE";
}

function stateTone(
  state: RiskState,
) {
  if (state === "SAFE") return "gain";
  if (state === "WARNING") return "warn";
  return "loss";
}

/* =========================================================
   LIMIT CARD
========================================================= */

function RiskLimitCard({
  item,
}: {
  item: RiskLimit;
}) {
  const state = riskState(
    item.current,
    item.limit,
  );

  const percentage =
    item.limit > 0
      ? Math.min(
          100,
          (Math.abs(item.current) /
            item.limit) *
            100,
        )
      : 100;

  return (
    <div className="rounded-lg border border-ink-700/70 bg-ink-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog-600">
            {item.label}
          </p>

          <p className="mt-2 font-mono text-lg text-fog-100">
            {formatNumber(
              item.current,
              2,
            )}{" "}
            <span className="text-xs text-fog-600">
              /{" "}
              {formatNumber(
                item.limit,
                2,
              )}{" "}
              {item.unit}
            </span>
          </p>
        </div>

        <StatusBadge
          status={state}
          size="sm"
        />
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            state === "SAFE" &&
              "bg-gain-400",
            state === "WARNING" &&
              "bg-gold-400",
            state === "BLOCKED" &&
              "bg-loss-400",
          )}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="mt-2 flex justify-between">
        <span className="font-mono text-[8.5px] text-fog-700">
          {percentage.toFixed(1)}% utilized
        </span>

        <span className="font-mono text-[8.5px] text-fog-700">
          {item.unit}
        </span>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-fog-600">
        {item.description}
      </p>
    </div>
  );
}

/* =========================================================
   SECURITY ITEM
========================================================= */

function SecurityItem({
  label,
  description,
  status,
  icon,
}: {
  label: string;
  description: string;
  status: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-ink-700/60 py-3 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink-700 bg-ink-900 text-fog-400">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-fog-200">
            {label}
          </p>

          <StatusBadge
            status={status}
            size="sm"
          />
        </div>

        <p className="mt-1 text-[9.5px] leading-relaxed text-fog-600">
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   RISK PAGE
========================================================= */

export default function Risk() {
  const interval =
    useRefreshInterval();

  const orders =
    useSourcedResource(
      () =>
        getOrders().then(
          (result) =>
            result.data,
        ),
      previewOrders,
      {
        intervalMs: interval,
      },
    );

  const positions =
    useSourcedResource(
      () =>
        getPositions().then(
          (result) =>
            result.data,
        ),
      previewPositions,
      {
        intervalMs: interval,
      },
    );

  const orderRows =
    orders.data?.data ?? [];

  const positionRows =
    positions.data?.data ?? [];

  const isPreview =
    orders.data?.source ===
    "preview";

  /* =======================================================
     ORDER RISK STATISTICS
  ======================================================= */

  const stats = useMemo(() => {
    let total = 0;
    let rejected = 0;
    let filled = 0;
    let buy = 0;
    let sell = 0;

    for (const order of orderRows) {
      total++;

      const status =
        String(
          order.status ?? "",
        ).toUpperCase();

      const side =
        String(
          order.side ?? "",
        ).toUpperCase();

      if (status === "REJECTED") {
        rejected++;
      }

      if (status === "FILLED") {
        filled++;
      }

      if (side === "BUY") {
        buy++;
      }

      if (side === "SELL") {
        sell++;
      }
    }

    return {
      total,
      rejected,
      filled,
      buy,
      sell,
      rejectionRate:
        total > 0
          ? (rejected / total) *
            100
          : 0,
    };
  }, [orderRows]);

  /* =======================================================
     EXPOSURE
  ======================================================= */

  const exposure = useMemo(() => {
    let gross = 0;
    let net = 0;

    for (const position of positionRows) {
      const quantity =
        toNumber(
          position.quantity,
        ) ?? 0;

      const price =
        toNumber(
          position.markPrice ??
            position.currentPrice ??
            position.averageEntryPrice,
        ) ?? 0;

      const notional =
        Math.abs(quantity) *
        price;

      gross += notional;
      net += quantity * price;
    }

    return {
      gross,
      net,
    };
  }, [positionRows]);

  /* =======================================================
     RISK LIMITS
  ======================================================= */

  /*
   * These values represent the frontend risk envelope.
   * Actual enforcement remains server-side in RiskManager.
   */

  const limits: RiskLimit[] = [
    {
      label: "Gross exposure",
      current: exposure.gross,
      limit: 100000,
      unit: "USD",
      description:
        "Aggregate absolute notional currently represented by open positions.",
    },
    {
      label: "Net exposure",
      current: Math.abs(
        exposure.net,
      ),
      limit: 50000,
      unit: "USD",
      description:
        "Signed portfolio exposure after offsetting long and short positions.",
    },
    {
      label: "Order quantity",
      current: orderRows.length
        ? Math.max(
            ...orderRows.map(
              (order) =>
                toNumber(
                  order.quantity,
                ) ?? 0,
            ),
          )
        : 0,
      limit: 1000,
      unit: "units",
      description:
        "Largest order quantity observed in the current order dataset.",
    },
    {
      label: "Order velocity",
      current: orderRows.length,
      limit: 10000,
      unit: "orders",
      description:
        "Current order population used as a dashboard-level activity indicator.",
    },
  ];

  const blockedLimits =
    limits.filter(
      (item) =>
        riskState(
          item.current,
          item.limit,
        ) === "BLOCKED",
    ).length;

  const warningLimits =
    limits.filter(
      (item) =>
        riskState(
          item.current,
          item.limit,
        ) === "WARNING",
    ).length;

  const overallState: RiskState =
    blockedLimits > 0
      ? "BLOCKED"
      : warningLimits > 0
        ? "WARNING"
        : "SAFE";

  return (
    <div className="space-y-4">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-ink-700/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-400">
              Risk Control
            </span>

            <span className="h-1 w-1 rounded-full bg-fog-600" />

            <Badge
              tone={
                overallState ===
                "SAFE"
                  ? "gain"
                  : overallState ===
                      "WARNING"
                    ? "warn"
                    : "loss"
              }
              size="sm"
            >
              {overallState}
            </Badge>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-fog-100">
            Risk & Security
          </h1>

          <p className="mt-1 max-w-3xl text-xs text-fog-500">
            Exposure controls, order validation, security
            controls and operational protection for the
            execution engine.
          </p>
        </div>
        <Button
          icon={
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                orders.loading &&
                  "animate-spin",
              )}
            />
          }
          onClick={() => {
            orders.refetch();
            positions.refetch();
          }}
        >
          Refresh
        </Button>
      </div>

      {/* =====================================================
          TOP METRICS
      ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Risk state"
          value={overallState}
          icon={
            overallState ===
            "SAFE" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )
          }
          tone={
            overallState ===
            "SAFE"
              ? "gain"
              : overallState ===
                  "WARNING"
                ? "gold"
                : "loss"
          }
          subValue={
            blockedLimits > 0
              ? `${blockedLimits} blocked limit`
              : `${warningLimits} warning limit`
          }
        />

        <MetricCard
          label="Gross exposure"
          value={formatNumber(
            exposure.gross,
            2,
          )}
          icon={
            <Gauge className="h-4 w-4" />
          }
          subValue="Absolute position notional"
        />

        <MetricCard
          label="Net exposure"
          value={formatNumber(
            exposure.net,
            2,
          )}
          icon={
            <Activity className="h-4 w-4" />
          }
          subValue="Signed portfolio exposure"
        />

        <MetricCard
          label="Rejected orders"
          value={String(
            stats.rejected,
          )}
          icon={
            <Ban className="h-4 w-4" />
          }
          tone={
            stats.rejected > 0
              ? "loss"
              : "gain"
          }
          subValue={`${stats.rejectionRate.toFixed(2)}% rejection rate`}
        />
      </div>

      {/* =====================================================
          RISK LIMITS
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Risk limits"
          subtitle="Dashboard representation of the execution risk envelope"
          actions={
            <Badge
              tone="neutral"
              size="sm"
            >
              SERVER ENFORCED
            </Badge>
          }
        />

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {limits.map(
            (item) => (
              <RiskLimitCard
                key={item.label}
                item={item}
              />
            ),
          )}
        </div>

        <div className="mt-4 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <InfoIcon />

            <p className="text-[9.5px] leading-relaxed text-fog-600">
              The dashboard visualizes risk state. Actual
              order acceptance must remain enforced by the
              C++ RiskManager before execution.
            </p>
          </div>
        </div>
      </Panel>

      {/* =====================================================
          SECURITY + KILL SWITCH
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeader
            title="Security controls"
            subtitle="Implemented protection layers"
          />

          <div className="mt-2">
            <SecurityItem
              label="API authentication"
              description="Protected API routes use API-key verification through the FastAPI security layer."
              status="IMPLEMENTED"
              icon={
                <Lock className="h-3.5 w-3.5" />
              }
            />

            <SecurityItem
              label="Request rate limiting"
              description="API request activity is constrained by the configured rate-limit middleware."
              status="IMPLEMENTED"
              icon={
                <Gauge className="h-3.5 w-3.5" />
              }
            />

            <SecurityItem
              label="Order validation"
              description="Order schema validation constrains symbol, side, order type, price and quantity inputs."
              status="IMPLEMENTED"
              icon={
                <ShieldCheck className="h-3.5 w-3.5" />
              }
            />

            <SecurityItem
              label="Risk validation"
              description="C++ RiskManager validates quantity, position and notional constraints before execution."
              status="IMPLEMENTED"
              icon={
                <Activity className="h-3.5 w-3.5" />
              }
            />

            <SecurityItem
              label="Kill switch"
              description="Database-backed kill-switch state can prevent further order processing when enabled."
              status="BASELINE"
              icon={
                <ShieldAlert className="h-3.5 w-3.5" />
              }
            />
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Operational protection"
            subtitle="Execution safety state"
            actions={
              <StatusBadge
                status="CONTROLLED"
                size="sm"
              />
            }
          />

          <div className="mt-3 rounded-lg border border-gain-400/15 bg-gain-400/[0.035] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gain-400/20 bg-gain-400/10 text-gain-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-fog-100">
                  Risk gateway active
                </p>

                <p className="mt-1 text-[10px] text-fog-600">
                  Orders are expected to pass risk validation
                  before reaching execution.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Order validation"
              value="ENABLED"
            />

            <KeyValueRow
              label="Position checks"
              value="ENABLED"
            />

            <KeyValueRow
              label="Notional checks"
              value="ENABLED"
            />

            <KeyValueRow
              label="Kill switch"
              value="DB CONTROLLED"
            />

            <KeyValueRow
              label="Execution mode"
              value="SIMULATED"
            />
          </div>
        </Panel>
      </div>

      {/* =====================================================
          ORDER FLOW
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader
            title="Order risk activity"
            subtitle="Current order population and validation outcomes"
          />

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <ActivityMetric
              label="Total orders"
              value={stats.total}
            />

            <ActivityMetric
              label="Filled"
              value={stats.filled}
            />

            <ActivityMetric
              label="Rejected"
              value={stats.rejected}
            />

            <ActivityMetric
              label="Buy / Sell"
              value={`${stats.buy} / ${stats.sell}`}
            />
          </div>

          <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-fog-600">
                  Validation flow
                </p>

                <p className="mt-1.5 text-[11px] text-fog-300">
                  Request â†’ Risk â†’ OMS â†’ Execution
                </p>
              </div>

              <ShieldCheck className="h-4 w-4 text-gain-400" />
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              {[
                "ORDER",
                "RISK",
                "OMS",
                "EXECUTION",
              ].map(
                (stage, index) => (
                  <div
                    key={stage}
                    className="flex shrink-0 items-center gap-2"
                  >
                    <div className="rounded-md border border-ink-700 bg-ink-880 px-3 py-2">
                      <span className="font-mono text-[9px] text-fog-300">
                        {stage}
                      </span>
                    </div>

                    {index < 3 ? (
                      <div className="h-px w-5 bg-ink-700" />
                    ) : null}
                  </div>
                ),
              )}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Exposure profile"
            subtitle="Current position concentration"
          />

          <div className="mt-3">
            <ExposureBar
              label="Gross"
              value={
                exposure.gross
              }
              limit={100000}
            />

            <ExposureBar
              label="Net"
              value={Math.abs(
                exposure.net,
              )}
              limit={50000}
            />
          </div>

          <div className="mt-4 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Open positions"
              value={String(
                positionRows.length,
              )}
            />

            <KeyValueRow
              label="Gross exposure"
              value={formatNumber(
                exposure.gross,
                2,
              )}
            />

            <KeyValueRow
              label="Net exposure"
              value={formatNumber(
                exposure.net,
                2,
              )}
            />

            <KeyValueRow
              label="Data source"
              value={
                isPreview
                  ? "PREVIEW"
                  : "BACKEND"
              }
            />
          </div>
        </Panel>
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-fog-600">
          <span className="text-gold-300">
            Security note:
          </span>{" "}
          this dashboard represents the current cybersecurity
          baseline. Final production hardening, audit logging and
          deployment-level security controls remain separate
          engineering work.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function ActivityMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-ink-700/60 bg-ink-900 p-3">
      <p className="font-mono text-[8.5px] uppercase tracking-wider text-fog-600">
        {label}
      </p>

      <p className="mt-1.5 font-mono text-base text-fog-100">
        {value}
      </p>
    </div>
  );
}

function ExposureBar({
  label,
  value,
  limit,
}: {
  label: string;
  value: number;
  limit: number;
}) {
  const percentage =
    limit > 0
      ? Math.min(
          100,
          (Math.abs(value) /
            limit) *
            100,
        )
      : 0;

  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
          {label}
        </span>

        <span className="font-mono text-[9px] text-fog-500">
          {percentage.toFixed(1)}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div
          className={cn(
            "h-full rounded-full",
            percentage >= 100
              ? "bg-loss-400"
              : percentage >= 80
                ? "bg-gold-400"
                : "bg-gain-400",
          )}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fog-600" />
  );
}



