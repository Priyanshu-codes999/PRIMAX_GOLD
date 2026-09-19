import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Download,
  Layers3,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
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
  ExposureDonutChart,
  CHART_COLORS,
} from "../charts";

import { getPositions } from "../services/backend";
import { previewPositions } from "../services/previewData";

import {
  useRefreshInterval,
  useSourcedResource,
} from "../hooks/useBackend";

import {
  downloadJson,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPrice,
  formatTimestamp,
  toNumber,
} from "../utils/format";

import type { Position } from "../types";

export default function Positions() {
  const interval = useRefreshInterval();

  const positions = useSourcedResource(
    () => getPositions().then((result) => result.data),
    previewPositions,
    {
      intervalMs: interval,
    },
  );

  const [selected, setSelected] = useState<Position | null>(null);

  const rows = positions.data?.data ?? [];
  const isPreview = positions.data?.source === "preview";

  /* =========================================================
     POSITION STATISTICS
  ========================================================= */

  const stats = useMemo(() => {
    const activeRows = rows.filter(
      (row) => (toNumber(row.quantity) ?? 0) !== 0,
    );

    const longs = activeRows.filter(
      (row) => (toNumber(row.quantity) ?? 0) > 0,
    );

    const shorts = activeRows.filter(
      (row) => (toNumber(row.quantity) ?? 0) < 0,
    );

    const gross = rows.reduce(
      (sum, row) =>
        sum + Math.abs(toNumber(row.positionValue) ?? 0),
      0,
    );

    const net = rows.reduce(
      (sum, row) =>
        sum + (toNumber(row.positionValue) ?? 0),
      0,
    );

    const unrealized = rows.reduce(
      (sum, row) =>
        sum + (toNumber(row.unrealizedPnl) ?? 0),
      0,
    );

    const realized = rows.reduce(
      (sum, row) =>
        sum + (toNumber(row.realizedPnl) ?? 0),
      0,
    );

    return {
      total: rows.length,
      active: activeRows.length,
      longs: longs.length,
      shorts: shorts.length,
      flat: rows.length - activeRows.length,
      gross,
      net,
      unrealized,
      realized,
      totalPnl: realized + unrealized,
    };
  }, [rows]);

  /* =========================================================
     P&L BY SYMBOL
  ========================================================= */

  const pnlBySymbol = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            Math.abs(toNumber(row.unrealizedPnl) ?? 0) > 0,
        )
        .map((row) => ({
          label: row.symbol,
          value: Number(
            (toNumber(row.unrealizedPnl) ?? 0).toFixed(2),
          ),
        }))
        .sort(
          (a, b) =>
            Math.abs(b.value) - Math.abs(a.value),
        ),
    [rows],
  );

  /* =========================================================
     EXPOSURE
  ========================================================= */

  const exposure = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            Math.abs(toNumber(row.positionValue) ?? 0) > 0,
        )
        .map((row) => ({
          name: row.symbol,
          value: Math.abs(
            toNumber(row.positionValue) ?? 0,
          ),
        })),
    [rows],
  );

  /* =========================================================
     TABLE COLUMNS
  ========================================================= */

  const columns: Column<Position>[] = [
    {
      key: "symbol",
      header: "Instrument",
      sortValue: (row) => row.symbol,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />

          <div>
            <p className="font-mono text-[11.5px] font-medium text-fog-100">
              {row.symbol}
            </p>

            {row.openedAt ? (
              <p className="mt-0.5 font-mono text-[9px] text-fog-600">
                opened {formatTimestamp(row.openedAt, "date")}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },

    {
      key: "direction",
      header: "Side",
      sortValue: (row) => row.quantity,
      render: (row) => {
        const quantity =
          toNumber(row.quantity) ?? 0;

        return (
          <Badge
            tone={
              quantity > 0
                ? "gain"
                : quantity < 0
                  ? "loss"
                  : "neutral"
            }
            size="sm"
          >
            {quantity > 0
              ? "LONG"
              : quantity < 0
                ? "SHORT"
                : "FLAT"}
          </Badge>
        );
      },
    },

    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      sortValue: (row) => row.quantity,
      render: (row) => (
        <span className="font-mono text-[11px] text-fog-200">
          {formatNumber(row.quantity, 2)}
        </span>
      ),
    },

    {
      key: "entry",
      header: "Avg entry",
      align: "right",
      sortValue: (row) =>
        row.averageEntryPrice ?? 0,
      render: (row) => (
        <span className="font-mono text-[11px] text-fog-300">
          {formatPrice(row.averageEntryPrice)}
        </span>
      ),
    },

    {
      key: "market",
      header: "Mark",
      align: "right",
      sortValue: (row) =>
        row.marketPrice ?? row.lastPrice ?? 0,
      render: (row) => (
        <span className="font-mono text-[11px] text-fog-100">
          {formatPrice(
            row.marketPrice ?? row.lastPrice,
          )}
        </span>
      ),
    },

    {
      key: "value",
      header: "Notional",
      align: "right",
      sortValue: (row) =>
        row.positionValue ?? 0,
      render: (row) => (
        <span className="font-mono text-[11px] text-fog-200">
          {formatCurrency(row.positionValue, 2)}
        </span>
      ),
    },

    {
      key: "unrealized",
      header: "Unrealized",
      align: "right",
      sortValue: (row) =>
        row.unrealizedPnl ?? 0,
      render: (row) => (
        <PnLIndicator
          value={row.unrealizedPnl}
          size="sm"
        />
      ),
    },

    {
      key: "realized",
      header: "Realized",
      align: "right",
      sortValue: (row) =>
        row.realizedPnl ?? 0,
      render: (row) => (
        <PnLIndicator
          value={row.realizedPnl}
          size="sm"
        />
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
              Exposure
            </span>

            <span className="h-1 w-1 rounded-full bg-fog-600" />

            <Badge
              tone={isPreview ? "warn" : "gain"}
              size="sm"
            >
              {isPreview ? "PREVIEW FEED" : "BACKEND"}
            </Badge>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-fog-100">
            Positions
          </h1>

          <p className="mt-1 max-w-2xl text-xs text-fog-500">
            Live position inventory, exposure and mark-to-market
            P&L reported by the trading engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-fog-600 xl:block">
            {rows.length} instruments
          </span>

          <Button
            icon={
              <Download className="h-3.5 w-3.5" />
            }
            onClick={() =>
              downloadJson(
                "primax-positions.json",
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
                  positions.loading
                    ? "h-3.5 w-3.5 animate-spin"
                    : "h-3.5 w-3.5"
                }
              />
            }
            onClick={positions.refetch}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* =====================================================
          POSITION STRIP
      ===================================================== */}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/70 bg-ink-700/50 md:grid-cols-3 xl:grid-cols-6">
        <TerminalMetric
          label="Open"
          value={stats.active.toString()}
          icon={
            <Layers3 className="h-3.5 w-3.5" />
          }
          sub={`${stats.longs} long Â· ${stats.shorts} short`}
          loading={positions.loading}
        />

        <TerminalMetric
          label="Gross Exposure"
          value={formatCurrency(stats.gross, 0)}
          icon={
            <BarChart3 className="h-3.5 w-3.5" />
          }
          sub="Absolute notional"
          loading={positions.loading}
        />

        <TerminalMetric
          label="Net Exposure"
          value={formatCurrency(stats.net, 0)}
          icon={
            <Scale className="h-3.5 w-3.5" />
          }
          sub={
            stats.gross > 0
              ? `${((stats.net / stats.gross) * 100).toFixed(1)}% net / gross`
              : "0.0% net / gross"
          }
          loading={positions.loading}
        />

        <TerminalMetric
          label="Unrealized P&L"
          value={
            <PnLIndicator
              value={stats.unrealized}
              size="sm"
            />
          }
          icon={
            <Activity className="h-3.5 w-3.5" />
          }
          loading={positions.loading}
        />

        <TerminalMetric
          label="Realized P&L"
          value={
            <PnLIndicator
              value={stats.realized}
              size="sm"
            />
          }
          icon={
            <TrendingUp className="h-3.5 w-3.5" />
          }
          loading={positions.loading}
        />

        <TerminalMetric
          label="Combined P&L"
          value={
            <PnLIndicator
              value={stats.totalPnl}
              size="sm"
            />
          }
          icon={
            <Wallet className="h-3.5 w-3.5" />
          }
          loading={positions.loading}
        />
      </div>

      {/* =====================================================
          EXPOSURE / P&L
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Unrealized P&L"
          subtitle="Mark-to-market contribution by instrument"
          height={260}
          loading={positions.loading}
          empty={pnlBySymbol.length === 0}
          emptyTitle="No position P&L"
          emptyMessage="P&L attribution will appear when positions are reported."
        >
          <DistributionBarChart
            data={pnlBySymbol}
            height={240}
            formatter={(value) =>
              formatCurrency(value, 0)
            }
            colorMode="single"
            baseColor={CHART_COLORS.info}
          />
        </ChartCard>

        <ChartCard
          title="Exposure composition"
          subtitle="Gross notional share across instruments"
          height={260}
          loading={positions.loading}
          empty={exposure.length === 0}
          emptyTitle="No exposure"
          emptyMessage="Exposure requires position notional data."
        >
          <ExposureDonutChart
            data={exposure}
            height={240}
            centerLabel="Gross"
            centerValue={formatCurrency(
              stats.gross,
              0,
            )}
          />
        </ChartCard>
      </div>

      {/* =====================================================
          RISK SNAPSHOT
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel>
          <SectionHeader
            title="Exposure profile"
            subtitle="Current directional inventory"
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Gross exposure"
              value={formatCurrency(stats.gross)}
            />

            <KeyValueRow
              label="Net exposure"
              value={formatCurrency(stats.net)}
            />

            <KeyValueRow
              label="Long positions"
              value={String(stats.longs)}
            />

            <KeyValueRow
              label="Short positions"
              value={String(stats.shorts)}
            />

            <KeyValueRow
              label="Flat positions"
              value={String(stats.flat)}
            />

            <KeyValueRow
              label="Net / gross"
              value={
                stats.gross > 0
                  ? formatPercent(
                      stats.net / stats.gross,
                    )
                  : "0.00%"
              }
            />
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="P&L attribution"
            subtitle="Position-level account impact"
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <PnlRow
              label="Unrealized"
              value={stats.unrealized}
            />

            <PnlRow
              label="Realized"
              value={stats.realized}
            />

            <PnlRow
              label="Combined"
              value={stats.totalPnl}
            />
          </div>

          <div className="mt-4 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-fog-500" />

              <span className="font-mono text-[9.5px] leading-relaxed text-fog-600">
                Unrealized P&L changes with the reported market
                price and is not realized until the position is reduced.
              </span>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Position state"
            subtitle="Engine inventory status"
            actions={
              <StatusBadge
                status={isPreview ? "SIMULATED" : "OPEN"}
                size="sm"
              />
            }
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Reported instruments"
              value={String(stats.total)}
            />

            <KeyValueRow
              label="Active instruments"
              value={String(stats.active)}
            />

            <KeyValueRow
              label="Data source"
              value={
                isPreview ? "Preview" : "Backend"
              }
            />

            <KeyValueRow
              label="Refresh interval"
              value={`${Math.round((interval ?? 0) / 1000)}s`}
            />

            <KeyValueRow
              label="Position endpoint"
              value="GET /api/positions"
            />
          </div>
        </Panel>
      </div>

      {/* =====================================================
          POSITION BLOTTER
      ===================================================== */}

      <Panel padded={false}>
        <div className="border-b border-ink-700/70 px-4 py-3.5">
          <SectionHeader
            title="Position blotter"
            subtitle="Signed quantity, entry, mark, notional and P&L"
            actions={
              <Badge tone="neutral" size="sm">
                {rows.length} ROWS
              </Badge>
            }
          />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.symbol}
          loading={positions.loading}
          error={
            positions.status === "error"
              ? positions.error
              : null
          }
          onRetry={positions.refetch}
          searchable
          searchPlaceholder="Search instrumentâ€¦"
          searchFn={(row, query) =>
            row.symbol
              .toLowerCase()
              .includes(query)
          }
          initialSort={{
            key: "value",
            direction: "desc",
          }}
          pageSize={12}
          onRowClick={setSelected}
          emptyTitle="No positions reported"
          emptyMessage="The positions endpoint returned an empty list."
        />
      </Panel>

      {/* =====================================================
          POSITION DETAIL
      ===================================================== */}

      <DetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `${selected.symbol} position`
            : ""
        }
        subtitle={
          selected?.openedAt
            ? `Opened ${formatTimestamp(
                selected.openedAt,
                "full",
              )}`
            : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  (toNumber(selected.quantity) ?? 0) > 0
                    ? "gain"
                    : (toNumber(selected.quantity) ?? 0) < 0
                      ? "loss"
                      : "neutral"
                }
                size="md"
              >
                {(toNumber(selected.quantity) ?? 0) > 0
                  ? "LONG"
                  : (toNumber(selected.quantity) ?? 0) < 0
                    ? "SHORT"
                    : "FLAT"}
              </Badge>

              <StatusBadge
                status={
                  isPreview
                    ? "SIMULATED"
                    : "OPEN"
                }
                size="sm"
              />
            </div>

            <div className="panel-flat divide-y divide-ink-700/70 px-3">
              <KeyValueRow
                label="Symbol"
                value={selected.symbol}
              />

              <KeyValueRow
                label="Quantity"
                value={formatNumber(
                  selected.quantity,
                  2,
                )}
              />

              <KeyValueRow
                label="Average entry"
                value={formatPrice(
                  selected.averageEntryPrice,
                )}
              />

              <KeyValueRow
                label="Market price"
                value={formatPrice(
                  selected.marketPrice ??
                    selected.lastPrice,
                )}
              />

              <KeyValueRow
                label="Position value"
                value={formatCurrency(
                  selected.positionValue,
                )}
              />

              <KeyValueRow
                label="Unrealized P&L"
                value={
                  <PnLIndicator
                    value={selected.unrealizedPnl}
                  />
                }
                valueClassName="text-right"
              />

              <KeyValueRow
                label="Realized P&L"
                value={
                  <PnLIndicator
                    value={selected.realizedPnl}
                  />
                }
              />

              <KeyValueRow
                label="Opened at"
                value={formatTimestamp(
                  selected.openedAt,
                  "full",
                )}
              />
            </div>

            <div className="rounded-md border border-ink-700/60 bg-ink-900/50 px-3.5 py-3">
              <p className="text-[10px] leading-relaxed text-fog-500">
                Position value and unrealized P&L are
                mark-to-market figures based on the price reported
                by the engine. They are not the same as realized
                cash proceeds.
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
   P&L ROW
=========================================================== */

function PnlRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fog-500">
        {label}
      </span>

      <PnLIndicator
        value={value}
        size="sm"
      />
    </div>
  );
}
