import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  Gauge,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  Panel,
  SectionHeader,
} from "../components/ui/Layout";

import { Badge, Button } from "../components/ui/Button";

import {
  MetricCard,
  StatusBadge,
} from "../components/ui/Indicators";

import { ChartCard } from "../components/ui/ChartCard";

import {
  MultiLineChart,
  CHART_COLORS,
} from "../charts";

import {
  getOrders,
  getExecutions,
  getPortfolio,
} from "../services/backend";

import {
  previewOrders,
  previewExecutions,
  previewPortfolio,
  previewEquityCurve,
} from "../services/previewData";

import {
  useRefreshInterval,
  useSourcedResource,
} from "../hooks/useBackend";

import {
  cn,
  formatNumber,
  toNumber,
} from "../utils/format";

import { equitySeries } from "../utils/chartData";

/* =========================================================
   HELPERS
========================================================= */

function percentile(
  values: number[],
  p: number,
): number {
  if (!values.length) return 0;

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const index =
    (p / 100) *
    (sorted.length - 1);

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return (
    sorted[lower] +
    (sorted[upper] -
      sorted[lower]) *
      (index - lower)
  );
}

function latencyLabel(
  ns: number,
): string {
  if (ns >= 1_000_000) {
    return `${(
      ns / 1_000_000
    ).toFixed(2)} ms`;
  }

  if (ns >= 1_000) {
    return `${(
      ns / 1_000
    ).toFixed(2)} µs`;
  }

  return `${ns.toFixed(0)} ns`;
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function AnalyticsStat({
  label,
  value,
  subValue,
  tone = "neutral",
}: {
  label: string;
  value: string;
  subValue?: string;
  tone?: "neutral" | "gain" | "loss" | "gold";
}) {
  return (
    <div className="rounded-lg border border-ink-700/70 bg-ink-900/70 p-3.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-fog-600">
        {label}
      </p>

      <p
        className={cn(
          "mt-2 font-mono text-lg",
          tone === "gain" &&
            "text-gain-400",
          tone === "loss" &&
            "text-loss-400",
          tone === "gold" &&
            "text-gold-300",
          tone === "neutral" &&
            "text-fog-100",
        )}
      >
        {value}
      </p>

      {subValue ? (
        <p className="mt-1 text-[9px] text-fog-600">
          {subValue}
        </p>
      ) : null}
    </div>
  );
}

function LatencyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-700/60 py-2.5 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
        {label}
      </span>

      <span className="font-mono text-[11px] text-fog-200">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function Analytics() {
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

  const executions =
    useSourcedResource(
      () =>
        getExecutions().then(
          (result) =>
            result.data,
        ),
      previewExecutions,
      {
        intervalMs: interval,
      },
    );

  const portfolio =
    useSourcedResource(
      () =>
        getPortfolio().then(
          (result) =>
            result.data,
        ),
      previewPortfolio,
      {
        intervalMs: interval,
      },
    );

  const orderRows =
    orders.data?.data ?? [];

  const executionRows =
    executions.data?.data ?? [];

  const isPreview =
    orders.data?.source ===
    "preview";

  /* =======================================================
     ORDER METRICS
  ======================================================= */

  const orderStats = useMemo(() => {
    let total = 0;
    let filled = 0;
    let rejected = 0;
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

      if (status === "FILLED") {
        filled++;
      }

      if (status === "REJECTED") {
        rejected++;
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
      filled,
      rejected,
      buy,
      sell,
      fillRate:
        total > 0
          ? (filled / total) *
            100
          : 0,
    };
  }, [orderRows]);

  /* =======================================================
     EXECUTION METRICS
  ======================================================= */

  const executionStats =
    useMemo(() => {
      let volume = 0;
      let turnover = 0;
      let fees = 0;

      const latencies: number[] =
        [];

      const prices: number[] =
        [];

      for (const execution of executionRows) {
        const quantity =
          toNumber(
            execution.quantity,
          ) ?? 0;

        const price =
          toNumber(
            execution.executionPrice ??
              execution.price,
          ) ?? 0;

        const fee =
          toNumber(
            execution.fee,
          ) ?? 0;

        const latency =
          toNumber(
            execution.latencyNs ??
              execution.latency_ns,
          );

        volume += quantity;
        turnover +=
          quantity * price;
        fees += fee;

        if (
          latency !== null &&
          latency >= 0
        ) {
          latencies.push(
            latency,
          );
        }

        if (price > 0) {
          prices.push(price);
        }
      }

      const averageLatency =
        latencies.length
          ? latencies.reduce(
              (a, b) => a + b,
              0,
            ) /
            latencies.length
          : 0;

      return {
        volume,
        turnover,
        fees,
        latencies,
        prices,
        averageLatency,
        p50: percentile(
          latencies,
          50,
        ),
        p95: percentile(
          latencies,
          95,
        ),
        p99: percentile(
          latencies,
          99,
        ),
      };
    }, [executionRows]);

  /* =======================================================
     PORTFOLIO METRICS
  ======================================================= */

  const portfolioData =
    portfolio.data?.data;

  const totalPnl =
    toNumber(
      portfolioData?.totalPnl,
    ) ?? 0;

  const realizedPnl =
    toNumber(
      portfolioData?.realizedPnl,
    ) ?? 0;

  const unrealizedPnl =
    toNumber(
      portfolioData?.unrealizedPnl,
    ) ?? 0;

  const feesPaid =
    toNumber(
      portfolioData?.feesPaid,
    ) ?? executionStats.fees;

  const initialCapital =
    toNumber(
      portfolioData?.initialCapital,
    ) ?? 100000;

  const returnPct =
    initialCapital > 0
      ? (totalPnl /
          initialCapital) *
        100
      : 0;

  /* =======================================================
     EQUITY
  ======================================================= */

  const equityPoints =
    useMemo(() => {
      const apiPoints =
        (portfolio.data?.data
          ?.equityCurve ??
          []) as never[];

      if (
        Array.isArray(apiPoints) &&
        apiPoints.length > 0
      ) {
        return equitySeries(
          apiPoints,
        );
      }

      if (isPreview) {
        return equitySeries(
          previewEquityCurve(),
        );
      }

      return [];
    }, [
      portfolio.data,
      isPreview,
    ]);

  /* =======================================================
     DRAWDOWN
  ======================================================= */

  const drawdownStats =
    useMemo(() => {
      const values =
        equityPoints
          .map((point) =>
            toNumber(
              point.equity,
            ),
          )
          .filter(
            (v): v is number =>
              v !== null,
          );

      if (!values.length) {
        return {
          maxDrawdown: 0,
          peak: 0,
        };
      }

      let peak =
        values[0];

      let maxDrawdown = 0;

      for (const value of values) {
        if (value > peak) {
          peak = value;
        }

        if (peak > 0) {
          const drawdown =
            ((peak - value) /
              peak) *
            100;

          maxDrawdown =
            Math.max(
              maxDrawdown,
              drawdown,
            );
        }
      }

      return {
        maxDrawdown,
        peak,
      };
    }, [equityPoints]);

  /* =======================================================
     TRADE P&L
  ======================================================= */

  const pnlStats =
    useMemo(() => {
      const tradePnls =
        executionRows
          .map((execution) =>
            toNumber(
              execution.pnl ??
                execution.realizedPnl,
            ),
          )
          .filter(
            (v): v is number =>
              v !== null,
          );

      const winning =
        tradePnls.filter(
          (v) => v > 0,
        );

      const losing =
        tradePnls.filter(
          (v) => v < 0,
        );

      const grossProfit =
        winning.reduce(
          (a, b) => a + b,
          0,
        );

      const grossLoss =
        Math.abs(
          losing.reduce(
            (a, b) => a + b,
            0,
          ),
        );

      return {
        trades:
          tradePnls.length,
        winning:
          winning.length,
        losing:
          losing.length,
        winRate:
          tradePnls.length
            ? (winning.length /
                tradePnls.length) *
              100
            : 0,
        profitFactor:
          grossLoss > 0
            ? grossProfit /
              grossLoss
            : 0,
        average:
          tradePnls.length
            ? tradePnls.reduce(
                (a, b) => a + b,
                0,
              ) /
              tradePnls.length
            : 0,
      };
    }, [executionRows]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshAll = () => {
    orders.refetch();
    executions.refetch();
    portfolio.refetch();
  };

  return (
    <div className="space-y-4">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-ink-700/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-400">
              Performance Research
            </span>

            <span className="h-1 w-1 rounded-full bg-fog-600" />

            <Badge
              tone={
                isPreview
                  ? "warn"
                  : "gain"
              }
              size="sm"
            >
              {isPreview
                ? "PREVIEW DATA"
                : "BACKEND DATA"}
            </Badge>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-fog-100">
            Analytics
          </h1>

          <p className="mt-1 max-w-3xl text-xs text-fog-500">
            Performance, execution quality, drawdown and
            latency analytics for the financial engine.
          </p>
        </div>

        <Button
          icon={
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (
                  orders.loading ||
                  executions.loading ||
                  portfolio.loading
                ) &&
                  "animate-spin",
              )}
            />
          }
          onClick={refreshAll}
        >
          Refresh
        </Button>
      </div>

      {/* =====================================================
          CORE PERFORMANCE
      ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total return"
          value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
          icon={
            returnPct >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )
          }
          tone={
            returnPct >= 0
              ? "gain"
              : "loss"
          }
          subValue="Portfolio return"
        />

        <MetricCard
          label="Total P&L"
          value={formatNumber(
            totalPnl,
            2,
          )}
          icon={
            <BarChart3 className="h-4 w-4" />
          }
          tone={
            totalPnl >= 0
              ? "gain"
              : "loss"
          }
          subValue="Realized + unrealized"
        />

        <MetricCard
          label="Max drawdown"
          value={`${drawdownStats.maxDrawdown.toFixed(2)}%`}
          icon={
            <TrendingDown className="h-4 w-4" />
          }
          tone="loss"
          subValue="Peak-to-trough"
        />

        <MetricCard
          label="Profit factor"
          value={
            pnlStats.profitFactor > 0
              ? pnlStats.profitFactor.toFixed(
                  3,
                )
              : "—"
          }
          icon={
            <Gauge className="h-4 w-4" />
          }
          subValue="Gross profit / gross loss"
        />
      </div>

      {/* =====================================================
          EQUITY + PERFORMANCE BREAKDOWN
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Equity curve"
          subtitle="Strategy / portfolio equity trajectory"
          height={310}
          loading={portfolio.loading}
          empty={equityPoints.length === 0}
          emptyTitle="No equity data"
          emptyMessage="Equity history will appear when the backend records portfolio performance."
        >
          <MultiLineChart
            data={equityPoints}
            height={280}
            formatter={(value) =>
              formatNumber(
                value,
                0,
              )
            }
            series={[
              {
                key: "equity",
                name: "Equity",
                color:
                  CHART_COLORS.gold,
              },
            ]}
            showLegend={false}
          />
        </ChartCard>

        <Panel>
          <SectionHeader
            title="Performance breakdown"
            subtitle="Portfolio-level attribution"
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <AnalyticsStat
              label="Realized P&L"
              value={formatNumber(
                realizedPnl,
                2,
              )}
              tone={
                realizedPnl >= 0
                  ? "gain"
                  : "loss"
              }
            />

            <AnalyticsStat
              label="Unrealized P&L"
              value={formatNumber(
                unrealizedPnl,
                2,
              )}
              tone={
                unrealizedPnl >= 0
                  ? "gain"
                  : "loss"
              }
            />

            <AnalyticsStat
              label="Fees paid"
              value={formatNumber(
                feesPaid,
                2,
              )}
              tone="gold"
            />

            <AnalyticsStat
              label="Initial capital"
              value={formatNumber(
                initialCapital,
                2,
              )}
            />
          </div>
        </Panel>
      </div>

      {/* =====================================================
          TRADE STATISTICS
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Trade statistics"
          subtitle="Observed order and execution outcomes"
          actions={
            <StatusBadge
              status={
                orderStats.rejected >
                0
                  ? "MONITORED"
                  : "NORMAL"
              }
              size="sm"
            />
          }
        />

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <AnalyticsStat
            label="Orders"
            value={String(
              orderStats.total,
            )}
          />

          <AnalyticsStat
            label="Filled"
            value={String(
              orderStats.filled,
            )}
            tone="gain"
          />

          <AnalyticsStat
            label="Rejected"
            value={String(
              orderStats.rejected,
            )}
            tone={
              orderStats.rejected >
              0
                ? "loss"
                : "neutral"
            }
          />

          <AnalyticsStat
            label="Fill rate"
            value={`${orderStats.fillRate.toFixed(2)}%`}
          />

          <AnalyticsStat
            label="Buy orders"
            value={String(
              orderStats.buy,
            )}
          />

          <AnalyticsStat
            label="Sell orders"
            value={String(
              orderStats.sell,
            )}
          />

          <AnalyticsStat
            label="Winning trades"
            value={String(
              pnlStats.winning,
            )}
            tone="gain"
          />

          <AnalyticsStat
            label="Losing trades"
            value={String(
              pnlStats.losing,
            )}
            tone="loss"
          />
        </div>
      </Panel>

      {/* =====================================================
          EXECUTION ANALYTICS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeader
            title="Execution performance"
            subtitle="Fill volume, turnover and fee impact"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <AnalyticsStat
              label="Executed volume"
              value={formatNumber(
                executionStats.volume,
                2,
              )}
            />

            <AnalyticsStat
              label="Turnover"
              value={formatNumber(
                executionStats.turnover,
                2,
              )}
              tone="gold"
            />

            <AnalyticsStat
              label="Fees"
              value={formatNumber(
                executionStats.fees,
                2,
              )}
              tone="gold"
            />

            <AnalyticsStat
              label="Avg trade P&L"
              value={formatNumber(
                pnlStats.average,
                2,
              )}
              tone={
                pnlStats.average >=
                0
                  ? "gain"
                  : "loss"
              }
            />
          </div>

          <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-900/50 p-3.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-fog-600">
              Trade quality
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] text-fog-600">
                  Win rate
                </p>

                <p className="mt-1 font-mono text-lg text-fog-100">
                  {pnlStats.winRate.toFixed(
                    2,
                  )}
                  %
                </p>
              </div>

              <div>
                <p className="text-[9px] text-fog-600">
                  Profit factor
                </p>

                <p className="mt-1 font-mono text-lg text-fog-100">
                  {pnlStats.profitFactor > 0
                    ? pnlStats.profitFactor.toFixed(
                        3,
                      )
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        {/* ===================================================
            LATENCY
        =================================================== */}

        <Panel>
          <SectionHeader
            title="Execution latency"
            subtitle="Recorded engine execution telemetry"
            actions={
              <Badge
                tone="neutral"
                size="sm"
              >
                NANOSECONDS
              </Badge>
            }
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <AnalyticsStat
              label="Average"
              value={latencyLabel(
                executionStats.averageLatency,
              )}
              tone="gold"
            />

            <AnalyticsStat
              label="P50"
              value={latencyLabel(
                executionStats.p50,
              )}
            />

            <AnalyticsStat
              label="P95"
              value={latencyLabel(
                executionStats.p95,
              )}
            />

            <AnalyticsStat
              label="P99"
              value={latencyLabel(
                executionStats.p99,
              )}
            />
          </div>

          <div className="mt-4 divide-y divide-ink-700/60 rounded-lg border border-ink-700/60 bg-ink-900/50 px-3">
            <LatencyRow
              label="Samples"
              value={String(
                executionStats
                  .latencies.length,
              )}
            />

            <LatencyRow
              label="Average"
              value={latencyLabel(
                executionStats.averageLatency,
              )}
            />

            <LatencyRow
              label="P50"
              value={latencyLabel(
                executionStats.p50,
              )}
            />

            <LatencyRow
              label="P95"
              value={latencyLabel(
                executionStats.p95,
              )}
            />

            <LatencyRow
              label="P99"
              value={latencyLabel(
                executionStats.p99,
              )}
            />
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-ink-700/60 bg-ink-900/40 px-3 py-2.5">
            <Clock3 className="mt-0.5 h-3 w-3 shrink-0 text-fog-600" />

            <p className="text-[9px] leading-relaxed text-fog-600">
              These are local engine telemetry measurements.
              They do not represent exchange-network or
              production HFT round-trip latency.
            </p>
          </div>
        </Panel>
      </div>

      {/* =====================================================
          ENGINE SCORECARD
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Engine scorecard"
          subtitle="Current quantitative research snapshot"
        />

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ScoreCard
            icon={
              <BarChart3 className="h-4 w-4" />
            }
            label="Performance"
            value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`}
            description="Current portfolio return"
            tone={
              returnPct >= 0
                ? "gain"
                : "loss"
            }
          />

          <ScoreCard
            icon={
              <TrendingDown className="h-4 w-4" />
            }
            label="Risk"
            value={`${drawdownStats.maxDrawdown.toFixed(2)}%`}
            description="Maximum observed drawdown"
            tone="loss"
          />

          <ScoreCard
            icon={
              <Activity className="h-4 w-4" />
            }
            label="Execution"
            value={`${orderStats.fillRate.toFixed(2)}%`}
            description="Order fill rate"
            tone="gold"
          />

          <ScoreCard
            icon={
              <Zap className="h-4 w-4" />
            }
            label="Latency"
            value={latencyLabel(
              executionStats.p99,
            )}
            description="P99 recorded execution latency"
            tone="neutral"
          />
        </div>
      </Panel>

      {/* =====================================================
          RESEARCH NOTE
      ===================================================== */}

      <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-fog-600">
          <span className="text-gold-300">
            Research note:
          </span>{" "}
          analytics are measurements of the current engine,
          simulator and stored backend data. They should not be
          interpreted as evidence of live-market profitability.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SCORE CARD
========================================================= */

function ScoreCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  tone:
    | "neutral"
    | "gain"
    | "loss"
    | "gold";
}) {
  return (
    <div className="rounded-lg border border-ink-700/70 bg-ink-900/70 p-4">
      <div className="flex items-center justify-between">
        <div className="text-fog-500">
          {icon}
        </div>

        <span className="font-mono text-[8px] uppercase tracking-wider text-fog-700">
          {label}
        </span>
      </div>

      <p
        className={cn(
          "mt-3 font-mono text-xl",
          tone === "gain" &&
            "text-gain-400",
          tone === "loss" &&
            "text-loss-400",
          tone === "gold" &&
            "text-gold-300",
          tone === "neutral" &&
            "text-fog-100",
        )}
      >
        {value}
      </p>

      <p className="mt-1 text-[9.5px] text-fog-600">
        {description}
      </p>
    </div>
  );
}