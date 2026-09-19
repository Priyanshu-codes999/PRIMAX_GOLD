import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Download,
  Gauge,
  Layers3,
  RefreshCw,
  Wallet,
} from "lucide-react";

import {
  Panel,
  SectionHeader,
  KeyValueRow,
} from "../components/ui/Layout";

import { Badge, Button } from "../components/ui/Button";

import {
  PnLIndicator,
  SideBadge,
  StatusBadge,
} from "../components/ui/Indicators";

import {
  DataTable,
  type Column,
} from "../components/ui/DataTable";

import { DetailDrawer } from "../components/ui/Overlays";

import { ChartCard } from "../components/ui/ChartCard";

import {
  DistributionBarChart,
  MultiLineChart,
  CHART_COLORS,
} from "../charts";

import { getExecutions } from "../services/backend";
import { previewExecutions } from "../services/previewData";

import {
  useRefreshInterval,
  useSourcedResource,
} from "../hooks/useBackend";

import {
  downloadJson,
  formatCurrency,
  formatNumber,
  formatPrice,
  formatTimestamp,
  timeAgo,
  toNumber,
} from "../utils/format";

import type { Execution } from "../types";

export default function Executions() {
  const interval = useRefreshInterval();

  const executions = useSourcedResource(
    () => getExecutions().then((result) => result.data),
    previewExecutions,
    {
      intervalMs: interval,
    },
  );

  const [selected, setSelected] =
    useState<Execution | null>(null);

  const rows = executions.data?.data ?? [];
  const isPreview =
    executions.data?.source === "preview";

  /* =========================================================
     EXECUTION STATISTICS
  ========================================================= */

  const stats = useMemo(() => {
    const count = rows.length;

    const buyRows = rows.filter(
      (row) => String(row.side).toUpperCase() === "BUY",
    );

    const sellRows = rows.filter(
      (row) => String(row.side).toUpperCase() === "SELL",
    );

    const volume = rows.reduce(
      (sum, row) =>
        sum + (toNumber(row.quantity) ?? 0),
      0,
    );

    const buyVolume = buyRows.reduce(
      (sum, row) =>
        sum + (toNumber(row.quantity) ?? 0),
      0,
    );

    const sellVolume = sellRows.reduce(
      (sum, row) =>
        sum + (toNumber(row.quantity) ?? 0),
      0,
    );

    const notional = rows.reduce(
      (sum, row) =>
        sum +
        (toNumber(row.price) ?? 0) *
          (toNumber(row.quantity) ?? 0),
      0,
    );

    const fees = rows.reduce(
      (sum, row) =>
        sum + (toNumber(row.fee) ?? 0),
      0,
    );

    const latencies = rows
      .map((row) => {
        const ns = toNumber(row.latencyNs);

        if (ns !== null) {
          return ns;
        }

        const ms = toNumber(row.latencyMs);

        return ms !== null
          ? ms * 1_000_000
          : null;
      })
      .filter(
        (value): value is number =>
          value !== null &&
          Number.isFinite(value),
      );

    const avgLatency =
      latencies.length > 0
        ? latencies.reduce(
            (sum, value) => sum + value,
            0,
          ) / latencies.length
        : null;

    const minLatency =
      latencies.length > 0
        ? Math.min(...latencies)
        : null;

    const maxLatency =
      latencies.length > 0
        ? Math.max(...latencies)
        : null;

    return {
      count,
      buyCount: buyRows.length,
      sellCount: sellRows.length,
      volume,
      buyVolume,
      sellVolume,
      notional,
      fees,
      avgPrice:
        volume > 0
          ? notional / volume
          : 0,
      avgLatency,
      minLatency,
      maxLatency,
    };
  }, [rows]);

  /* =========================================================
     LATENCY SERIES
  ========================================================= */

  const latencySeries = useMemo(
    () =>
      rows
        .slice(0, 50)
        .reverse()
        .map((row, index) => {
          const ns =
            toNumber(row.latencyNs) ??
            ((toNumber(row.latencyMs) ?? 0) *
              1_000_000);

          return {
            label: String(index + 1),
            latencyUs: Number(
              (ns / 1000).toFixed(2),
            ),
          };
        }),
    [rows],
  );

  /* =========================================================
     SYMBOL VOLUME
  ========================================================= */

  const symbolVolume = useMemo(() => {
    const map = new Map<string, number>();

    rows.forEach((row) => {
      map.set(
        row.symbol,
        (map.get(row.symbol) ?? 0) +
          (toNumber(row.quantity) ?? 0),
      );
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({
        label,
        value,
      }));
  }, [rows]);

  /* =========================================================
     FEE BY SYMBOL
  ========================================================= */

  const feeBySymbol = useMemo(() => {
    const map = new Map<string, number>();

    rows.forEach((row) => {
      map.set(
        row.symbol,
        (map.get(row.symbol) ?? 0) +
          (toNumber(row.fee) ?? 0),
      );
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({
        label,
        value: Number(value.toFixed(2)),
      }));
  }, [rows]);

  /* =========================================================
     TABLE
  ========================================================= */

  const columns: Column<Execution>[] = [
    {
      key: "id",
      header: "Execution",
      sortValue: (row) => row.id,
      render: (row) => (
        <span className="font-mono text-[10.5px] text-fog-200">
          {row.id}
        </span>
      ),
    },

    {
      key: "orderId",
      header: "Order",
      sortValue: (row) => row.orderId,
      render: (row) => (
        <span className="font-mono text-[10px] text-fog-500">
          {row.orderId}
        </span>
      ),
    },

    {
      key: "symbol",
      header: "Instrument",
      sortValue: (row) => row.symbol,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />

          <span className="font-mono text-[11px] font-medium text-fog-100">
            {row.symbol}
          </span>
        </div>
      ),
    },

    {
      key: "side",
      header: "Side",
      sortValue: (row) => row.side,
      render: (row) => (
        <SideBadge side={row.side} />
      ),
    },

    {
      key: "price",
      header: "Fill price",
      align: "right",
      sortValue: (row) => row.price,
      render: (row) => (
        <span className="font-mono text-[11px] text-fog-100">
          {formatPrice(row.price)}
        </span>
      ),
    },

    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      sortValue: (row) => row.quantity,
      render: (row) => (
        <span className="font-mono text-[11px] text-fog-300">
          {formatNumber(row.quantity, 2)}
        </span>
      ),
    },

    {
      key: "notional",
      header: "Notional",
      align: "right",
      sortValue: (row) =>
        (toNumber(row.price) ?? 0) *
        (toNumber(row.quantity) ?? 0),
      render: (row) => (
        <span className="font-mono text-[11px] text-fog-200">
          {formatCurrency(
            (toNumber(row.price) ?? 0) *
              (toNumber(row.quantity) ?? 0),
            2,
          )}
        </span>
      ),
    },

    {
      key: "fee",
      header: "Fee",
      align: "right",
      sortValue: (row) => row.fee ?? 0,
      render: (row) => (
        <span className="font-mono text-[10.5px] text-fog-400">
          {formatCurrency(row.fee)}
        </span>
      ),
    },

    {
      key: "latency",
      header: "Latency",
      align: "right",
      sortValue: (row) =>
        row.latencyNs ??
        row.latencyMs ??
        0,
      render: (row) => {
        const ns =
          toNumber(row.latencyNs) ??
          ((toNumber(row.latencyMs) ?? 0) *
            1_000_000);

        return (
          <span className="font-mono text-[10px] text-fog-300">
            {formatLatencyValue(ns)}
          </span>
        );
      },
    },

    {
      key: "timestamp",
      header: "Time",
      align: "right",
      sortValue: (row) =>
        row.timestamp ?? "",
      render: (row) => (
        <div>
          <p className="font-mono text-[10px] text-fog-300">
            {formatTimestamp(row.timestamp)}
          </p>

          <p className="font-mono text-[9px] text-fog-600">
            {row.timestamp
              ? timeAgo(row.timestamp)
              : "—"}
          </p>
        </div>
      ),
    },

    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            setSelected(row);
          }}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-ink-700/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-400">
              Execution
            </span>

            <span className="h-1 w-1 rounded-full bg-fog-600" />

            <Badge
              tone={isPreview ? "warn" : "gain"}
              size="sm"
            >
              {isPreview
                ? "PREVIEW FEED"
                : "BACKEND"}
            </Badge>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-fog-100">
            Executions
          </h1>

          <p className="mt-1 max-w-2xl text-xs text-fog-500">
            Fill-level execution telemetry, transaction costs,
            volume and latency from the execution engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-fog-600 xl:block">
            {rows.length} fills
          </span>

          <Button
            icon={
              <Download className="h-3.5 w-3.5" />
            }
            onClick={() =>
              downloadJson(
                "primax-executions.json",
                rows,
              )
            }
          >
            Export
          </Button>

          <Button
            icon={
              <RefreshCw
                className={
                  executions.loading
                    ? "h-3.5 w-3.5 animate-spin"
                    : "h-3.5 w-3.5"
                }
              />
            }
            onClick={executions.refetch}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* =====================================================
          EXECUTION STRIP
      ===================================================== */}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/70 bg-ink-700/50 md:grid-cols-3 xl:grid-cols-6">
        <TerminalMetric
          label="Fills"
          value={stats.count.toLocaleString()}
          icon={
            <Layers3 className="h-3.5 w-3.5" />
          }
          sub={`${stats.buyCount} buy · ${stats.sellCount} sell`}
          loading={executions.loading}
        />

        <TerminalMetric
          label="Executed Volume"
          value={formatNumber(
            stats.volume,
            0,
          )}
          icon={
            <Activity className="h-3.5 w-3.5" />
          }
          sub={`Buy ${formatNumber(stats.buyVolume, 0)} · Sell ${formatNumber(stats.sellVolume, 0)}`}
          loading={executions.loading}
        />

        <TerminalMetric
          label="Turnover"
          value={formatCurrency(
            stats.notional,
            0,
          )}
          icon={
            <Wallet className="h-3.5 w-3.5" />
          }
          sub="Executed notional"
          loading={executions.loading}
        />

        <TerminalMetric
          label="Fees"
          value={formatCurrency(
            stats.fees,
            2,
          )}
          icon={
            <Gauge className="h-3.5 w-3.5" />
          }
          sub="Recorded execution fees"
          loading={executions.loading}
        />

        <TerminalMetric
          label="VWAP"
          value={formatPrice(
            stats.avgPrice,
          )}
          icon={
            <Activity className="h-3.5 w-3.5" />
          }
          sub="Volume-weighted fill price"
          loading={executions.loading}
        />

        <TerminalMetric
          label="Avg Latency"
          value={
            stats.avgLatency !== null
              ? formatLatencyValue(
                  stats.avgLatency,
                )
              : "—"
          }
          icon={
            <Clock3 className="h-3.5 w-3.5" />
          }
          sub={
            stats.minLatency !== null &&
            stats.maxLatency !== null
              ? `Min ${formatLatencyValue(stats.minLatency)} · Max ${formatLatencyValue(stats.maxLatency)}`
              : "No latency telemetry"
          }
          loading={executions.loading}
        />
      </div>

      {/* =====================================================
          FLOW SUMMARY
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Execution flow"
          subtitle="Buy and sell fill distribution"
          actions={
            <span className="font-mono text-[9px] text-fog-600">
              {stats.count} FILLS
            </span>
          }
        />

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FlowCard
            label="BUY"
            count={stats.buyCount}
            volume={stats.buyVolume}
            total={stats.volume}
            icon={
              <ArrowUpRight className="h-4 w-4" />
            }
            tone="gain"
          />

          <FlowCard
            label="SELL"
            count={stats.sellCount}
            volume={stats.sellVolume}
            total={stats.volume}
            icon={
              <ArrowDownRight className="h-4 w-4" />
            }
            tone="loss"
          />
        </div>
      </Panel>

      {/* =====================================================
          TELEMETRY
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Execution latency"
          subtitle="Most recent fills · microseconds"
          height={270}
          loading={executions.loading}
          empty={latencySeries.length === 0}
          emptyTitle="No latency telemetry"
          emptyMessage="Latency values appear once executions are recorded."
        >
          <MultiLineChart
            data={latencySeries}
            height={250}
            formatter={(value) =>
              `${Number(value).toFixed(0)} µs`
            }
            series={[
              {
                key: "latencyUs",
                name: "Latency",
                color: CHART_COLORS.info,
              },
            ]}
            showLegend={false}
          />
        </ChartCard>

        <Panel>
          <SectionHeader
            title="Latency summary"
            subtitle="Observed execution telemetry"
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Average"
              value={
                stats.avgLatency !== null
                  ? formatLatencyValue(
                      stats.avgLatency,
                    )
                  : "—"
              }
            />

            <KeyValueRow
              label="Minimum"
              value={
                stats.minLatency !== null
                  ? formatLatencyValue(
                      stats.minLatency,
                    )
                  : "—"
              }
            />

            <KeyValueRow
              label="Maximum"
              value={
                stats.maxLatency !== null
                  ? formatLatencyValue(
                      stats.maxLatency,
                    )
                  : "—"
              }
            />

            <KeyValueRow
              label="Samples"
              value={String(
                rows.filter(
                  (row) =>
                    row.latencyNs !==
                      undefined ||
                    row.latencyMs !==
                      undefined,
                ).length,
              )}
            />
          </div>

          <div className="mt-4 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5">
            <p className="font-mono text-[9.5px] leading-relaxed text-fog-600">
              Latency is displayed from the telemetry recorded
              by the execution layer. It should not be interpreted
              as production exchange-network latency.
            </p>
          </div>
        </Panel>
      </div>

      {/* =====================================================
          VOLUME / FEE ANALYTICS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Volume by instrument"
          subtitle="Executed quantity concentration"
          height={260}
          loading={executions.loading}
          empty={symbolVolume.length === 0}
          emptyTitle="No volume data"
          emptyMessage="Volume distribution appears when executions are available."
        >
          <DistributionBarChart
            data={symbolVolume}
            height={240}
            colorMode="single"
            baseColor={CHART_COLORS.gold}
            formatter={(value) =>
              formatNumber(value, 0, {
                compact: true,
              })
            }
          />
        </ChartCard>

        <ChartCard
          title="Fee concentration"
          subtitle="Recorded transaction cost by instrument"
          height={260}
          loading={executions.loading}
          empty={feeBySymbol.length === 0}
          emptyTitle="No fee data"
          emptyMessage="Fee attribution appears once execution fees are available."
        >
          <DistributionBarChart
            data={feeBySymbol}
            height={240}
            colorMode="single"
            baseColor={CHART_COLORS.loss}
            formatter={(value) =>
              formatCurrency(value, 2)
            }
          />
        </ChartCard>
      </div>

      {/* =====================================================
          EXECUTION LOG
      ===================================================== */}

      <Panel padded={false}>
        <div className="border-b border-ink-700/70 px-4 py-3.5">
          <SectionHeader
            title="Execution blotter"
            subtitle="Fill-level execution record"
            actions={
              <Badge tone="neutral" size="sm">
                {rows.length} RECORDS
              </Badge>
            }
          />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={executions.loading}
          error={
            executions.status === "error"
              ? executions.error
              : null
          }
          onRetry={executions.refetch}
          searchable
          searchPlaceholder="Search execution, order, symbol…"
          searchFn={(row, query) =>
            [
              row.id,
              row.orderId,
              row.symbol,
              row.side,
            ].some((value) =>
              String(value)
                .toLowerCase()
                .includes(query),
            )
          }
          initialSort={{
            key: "timestamp",
            direction: "desc",
          }}
          pageSize={12}
          onRowClick={setSelected}
          emptyTitle="No executions recorded"
          emptyMessage="The executions endpoint returned no fills."
        />
      </Panel>

      {/* =====================================================
          DETAIL DRAWER
      ===================================================== */}

      <DetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `Execution ${selected.id}`
            : ""
        }
        subtitle={
          selected
            ? `${selected.symbol} · ${selected.side} · ${formatTimestamp(selected.timestamp, "full")}`
            : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SideBadge
                side={selected.side}
                size="md"
              />

              <StatusBadge
                status={
                  isPreview
                    ? "SIMULATED"
                    : "FILLED"
                }
                size="sm"
              />

              {selected.venue ? (
                <Badge
                  tone="neutral"
                  size="sm"
                >
                  {selected.venue}
                </Badge>
              ) : null}
            </div>

            <div className="panel-flat divide-y divide-ink-700/70 px-3">
              <KeyValueRow
                label="Execution ID"
                value={selected.id}
              />

              <KeyValueRow
                label="Order ID"
                value={selected.orderId}
              />

              <KeyValueRow
                label="Instrument"
                value={selected.symbol}
              />

              <KeyValueRow
                label="Side"
                value={selected.side}
              />

              <KeyValueRow
                label="Fill price"
                value={formatPrice(
                  selected.price,
                )}
              />

              <KeyValueRow
                label="Quantity"
                value={formatNumber(
                  selected.quantity,
                  2,
                )}
              />

              <KeyValueRow
                label="Notional"
                value={formatCurrency(
                  (toNumber(
                    selected.price,
                  ) ?? 0) *
                    (toNumber(
                      selected.quantity,
                    ) ?? 0),
                )}
              />

              <KeyValueRow
                label="Fee"
                value={formatCurrency(
                  selected.fee,
                )}
              />

              <KeyValueRow
                label="Latency"
                value={formatLatencyValue(
                  getLatencyNs(selected),
                )}
              />

              <KeyValueRow
                label="Timestamp"
                value={formatTimestamp(
                  selected.timestamp,
                  "full",
                )}
              />

              <KeyValueRow
                label="Venue"
                value={
                  selected.venue ?? "—"
                }
              />
            </div>

            <div className="rounded-md border border-ink-700/60 bg-ink-900/50 px-3.5 py-3">
              <p className="font-mono text-[9.5px] leading-relaxed text-fog-600">
                This record represents a completed execution
                reported by the execution layer. Fee and latency
                values come directly from the recorded execution
                telemetry.
              </p>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

/* ===========================================================
   TERMINAL METRIC
=========================================================== */

function TerminalMetric({
  label,
  value,
  icon,
  sub,
  loading,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  sub?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-ink-900 px-3 py-3">
        <div className="h-2.5 w-20 animate-pulse rounded bg-ink-700" />
        <div className="mt-2 h-5 w-24 animate-pulse rounded bg-ink-800" />
        <div className="mt-1.5 h-2 w-28 animate-pulse rounded bg-ink-800" />
      </div>
    );
  }

  return (
    <div className="bg-ink-900 px-3 py-3 transition-colors hover:bg-ink-800/70">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
          {label}
        </span>

        <span className="text-fog-600">
          {icon}
        </span>
      </div>

      <div className="mt-1.5 font-mono text-sm font-medium text-fog-100">
        {value}
      </div>

      {sub ? (
        <div className="mt-1 truncate font-mono text-[8.5px] text-fog-600">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/* ===========================================================
   BUY / SELL FLOW CARD
=========================================================== */

function FlowCard({
  label,
  count,
  volume,
  total,
  icon,
  tone,
}: {
  label: string;
  count: number;
  volume: number;
  total: number;
  icon: ReactNode;
  tone: "gain" | "loss";
}) {
  const share =
    total > 0
      ? (volume / total) * 100
      : 0;

  return (
    <div className="rounded-md border border-ink-700/60 bg-ink-900/60 p-3.5">
      <div className="flex items-center justify-between">
        <div
          className={`flex items-center gap-2 font-mono text-[10px] font-semibold ${
            tone === "gain"
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {icon}
          {label}
        </div>

        <span className="font-mono text-[10px] text-fog-600">
          {share.toFixed(1)}% volume
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
            Fills
          </p>

          <p className="mt-1 font-mono text-sm text-fog-200">
            {count.toLocaleString()}
          </p>
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
            Volume
          </p>

          <p className="mt-1 font-mono text-sm text-fog-200">
            {formatNumber(volume, 0)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full rounded-full ${
            tone === "gain"
              ? "bg-emerald-400"
              : "bg-red-400"
          }`}
          style={{
            width: `${Math.min(
              100,
              share,
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ===========================================================
   LATENCY HELPERS
=========================================================== */

function getLatencyNs(
  row: Execution,
): number {
  const ns = toNumber(row.latencyNs);

  if (ns !== null) {
    return ns;
  }

  return (
    (toNumber(row.latencyMs) ?? 0) *
    1_000_000
  );
}

function formatLatencyValue(
  ns: number,
): string {
  if (!Number.isFinite(ns)) {
    return "—";
  }

  if (ns < 1_000) {
    return `${ns.toFixed(0)} ns`;
  }

  if (ns < 1_000_000) {
    return `${(ns / 1_000).toFixed(2)} µs`;
  }

  return `${(ns / 1_000_000).toFixed(2)} ms`;
}