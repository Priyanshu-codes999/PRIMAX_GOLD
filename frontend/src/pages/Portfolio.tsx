import { useMemo } from "react";
import {
  Banknote,
  Download,
  LineChart,
  Percent,
  RefreshCw,
  Receipt,
  Wallet,
  Activity,
  Layers3,
  CircleDollarSign,
} from "lucide-react";

import { Panel, SectionHeader, KeyValueRow } from "../components/ui/Layout";
import { Badge, Button } from "../components/ui/Button";
import { PnLIndicator, StatusBadge } from "../components/ui/Indicators";
import { ChartCard } from "../components/ui/ChartCard";

import {
  DistributionBarChart,
  DrawdownChart,
  EquityAreaChart,
  ExposureDonutChart,
  MultiLineChart,
  CHART_COLORS,
} from "../charts";

import {
  getExecutions,
  getPortfolio,
  getPositions,
} from "../services/backend";

import {
  previewEquityCurve,
  previewExecutions,
  previewPortfolio,
  previewPositions,
} from "../services/previewData";

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

import { equitySeries } from "../utils/chartData";

export default function Portfolio() {
  const interval = useRefreshInterval();

  const portfolio = useSourcedResource(
    () => getPortfolio().then((result) => result.data),
    previewPortfolio,
    {
      intervalMs: interval,
    },
  );

  const positions = useSourcedResource(
    () => getPositions().then((result) => result.data),
    previewPositions,
    {
      intervalMs: interval,
    },
  );

  const executions = useSourcedResource(
    () => getExecutions().then((result) => result.data),
    previewExecutions,
    {
      intervalMs: interval,
    },
  );

  const data = portfolio.data?.data;
  const positionRows = positions.data?.data ?? [];
  const executionRows = executions.data?.data ?? [];

  const isPreview = portfolio.data?.source === "preview";

  /* -------------------------------------------------------
     Equity history
  ------------------------------------------------------- */

  const equityPoints = useMemo(() => {
    const apiPoints = (data?.equityCurve ?? data?.history ?? []) as never[];

    if (Array.isArray(apiPoints) && apiPoints.length > 0) {
      return equitySeries(apiPoints);
    }

    if (portfolio.data?.source === "preview") {
      return equitySeries(previewEquityCurve());
    }

    return [];
  }, [data, portfolio.data?.source]);

  const drawdownPoints = useMemo(
    () =>
      equityPoints.map((point) => ({
        label: point.label,
        drawdown: Number(point.drawdown ?? 0),
      })),
    [equityPoints],
  );

  /* -------------------------------------------------------
     Fee attribution
  ------------------------------------------------------- */

  const feeImpact = useMemo(() => {
    const map = new Map<string, number>();

    executionRows.forEach((row) => {
      map.set(
        row.symbol,
        (map.get(row.symbol) ?? 0) + (toNumber(row.fee) ?? 0),
      );
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({
        label,
        value: Number(value.toFixed(2)),
      }));
  }, [executionRows]);

  /* -------------------------------------------------------
     Exposure
  ------------------------------------------------------- */

  const exposure = useMemo(
    () =>
      positionRows
        .filter(
          (row) => Math.abs(toNumber(row.positionValue) ?? 0) > 0,
        )
        .map((row) => ({
          name: row.symbol,
          value: Math.abs(toNumber(row.positionValue) ?? 0),
        })),
    [positionRows],
  );

  /* -------------------------------------------------------
     Derived account metrics
  ------------------------------------------------------- */

  const cash = toNumber(data?.cash) ?? 0;
  const equity = toNumber(data?.equity ?? data?.portfolioValue) ?? 0;
  const portfolioValue = toNumber(data?.portfolioValue ?? data?.equity) ?? 0;
  const realizedPnl = toNumber(data?.realizedPnl) ?? 0;
  const unrealizedPnl = toNumber(data?.unrealizedPnl) ?? 0;
  const totalPnl = toNumber(data?.totalPnl) ?? 0;
  const fees = toNumber(data?.fees) ?? 0;
  const initialCapital = toNumber(data?.initialCapital) ?? 0;

  const investedValue = Math.max(
    0,
    Math.abs(portfolioValue - cash),
  );

  const returnPct =
    initialCapital > 0
      ? (totalPnl / initialCapital) * 100
      : null;

  const grossExposure = exposure.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const netExposurePct =
    equity !== 0 ? (grossExposure / Math.abs(equity)) * 100 : 0;

  const refreshAll = () => {
    portfolio.refetch();
    positions.refetch();
    executions.refetch();
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
              Account
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
            Portfolio
          </h1>

          <p className="mt-1 max-w-2xl text-xs text-fog-500">
            Equity, cash, exposure and P&L attribution from the trading
            engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-fog-600 xl:block">
            Updated {formatTimestamp(data?.timestamp ?? portfolio.lastUpdated)}
          </span>

          <Button
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() =>
              downloadJson("primax-portfolio.json", data ?? {})
            }
          >
            Export
          </Button>

          <Button
            icon={
              <RefreshCw
                className={
                  portfolio.loading
                    ? "h-3.5 w-3.5 animate-spin"
                    : "h-3.5 w-3.5"
                }
              />
            }
            onClick={refreshAll}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* =====================================================
          ACCOUNT STRIP
      ===================================================== */}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/70 bg-ink-700/50 md:grid-cols-3 xl:grid-cols-6">
        <AccountStat
          label="Net Equity"
          value={formatCurrency(equity)}
          icon={<Wallet className="h-3.5 w-3.5" />}
          loading={portfolio.loading}
        />

        <AccountStat
          label="Available Cash"
          value={formatCurrency(cash)}
          icon={<Banknote className="h-3.5 w-3.5" />}
          loading={portfolio.loading}
        />

        <AccountStat
          label="Invested Value"
          value={formatCurrency(investedValue)}
          icon={<Layers3 className="h-3.5 w-3.5" />}
          loading={portfolio.loading}
        />

        <AccountStat
          label="Realized P&L"
          value={
            <PnLIndicator
              value={realizedPnl}
              size="sm"
            />
          }
          icon={<LineChart className="h-3.5 w-3.5" />}
          loading={portfolio.loading}
        />

        <AccountStat
          label="Unrealized P&L"
          value={
            <PnLIndicator
              value={unrealizedPnl}
              size="sm"
            />
          }
          icon={<Activity className="h-3.5 w-3.5" />}
          loading={portfolio.loading}
        />

        <AccountStat
          label="Total Return"
          value={
            returnPct === null
              ? "—"
              : `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`
          }
          icon={<Percent className="h-3.5 w-3.5" />}
          tone={
            returnPct !== null && returnPct >= 0
              ? "gain"
              : "loss"
          }
          loading={portfolio.loading}
        />
      </div>

      {/* =====================================================
          MAIN TERMINAL ROW
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Equity */}
        <ChartCard
          title="Account equity"
          subtitle="Portfolio value over the available observation window"
          height={330}
          loading={portfolio.loading}
          empty={equityPoints.length === 0}
          emptyTitle="No equity history"
          emptyMessage="The backend has not supplied an equity time series yet."
        >
          <EquityAreaChart
            data={equityPoints}
            dataKey="equity"
            height={300}
            baseline={
              initialCapital > 0
                ? initialCapital
                : undefined
            }
            baselineLabel="Initial capital"
            formatter={(value) =>
              formatCurrency(value, 0)
            }
          />
        </ChartCard>

        {/* Account snapshot */}
        <Panel>
          <SectionHeader
            title="Account snapshot"
            subtitle="Current capital allocation"
            actions={
              <StatusBadge
                status={isPreview ? "SIMULATED" : "REPORTED"}
                size="sm"
              />
            }
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Initial capital"
              value={formatCurrency(initialCapital)}
            />

            <KeyValueRow
              label="Cash"
              value={formatCurrency(cash)}
            />

            <KeyValueRow
              label="Invested value"
              value={formatCurrency(investedValue)}
            />

            <KeyValueRow
              label="Net equity"
              value={formatCurrency(equity)}
            />

            <KeyValueRow
              label="Gross exposure"
              value={formatCurrency(grossExposure)}
            />

            <KeyValueRow
              label="Exposure / equity"
              value={`${netExposurePct.toFixed(2)}%`}
            />

            <KeyValueRow
              label="Fees paid"
              value={formatCurrency(fees)}
            />

            <KeyValueRow
              label="Total P&L"
              value={
                <PnLIndicator
                  value={totalPnl}
                  size="sm"
                />
              }
            />
          </div>

          <div className="mt-4 rounded-md border border-ink-700/60 bg-ink-900/50 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
                Capital utilisation
              </span>

              <span className="font-mono text-[10px] text-fog-300">
                {equity > 0
                  ? `${((investedValue / equity) * 100).toFixed(1)}%`
                  : "0.0%"}
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-gold-500"
                style={{
                  width: `${Math.min(
                    100,
                    equity > 0
                      ? (investedValue / equity) * 100
                      : 0,
                  )}%`,
                }}
              />
            </div>
          </div>
        </Panel>
      </div>

      {/* =====================================================
          P&L / EXPOSURE
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="P&L attribution"
          subtitle="Realized, unrealized and total account P&L"
          height={270}
          loading={portfolio.loading}
          empty={equityPoints.length === 0}
          emptyTitle="No P&L history"
          emptyMessage="P&L history requires a time series from the backend."
        >
          <MultiLineChart
            data={equityPoints}
            height={250}
            formatter={(value) =>
              formatCurrency(value, 0)
            }
            series={[
              {
                key: "realized",
                name: "Realized",
                color: CHART_COLORS.gold,
              },
              {
                key: "unrealized",
                name: "Unrealized",
                color: CHART_COLORS.info,
              },
              {
                key: "pnl",
                name: "Total P&L",
                color: CHART_COLORS.gain,
                dashed: true,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Exposure"
          subtitle="Gross notional by instrument"
          height={270}
          loading={positions.loading}
          empty={exposure.length === 0}
          emptyTitle="No exposure"
          emptyMessage="Exposure appears when positions are reported."
        >
          <ExposureDonutChart
            data={exposure}
            height={250}
            centerLabel="Gross"
            centerValue={formatCurrency(
              grossExposure,
              0,
            )}
          />
        </ChartCard>
      </div>

      {/* =====================================================
          RISK / DRAWDOWN / FEES
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Drawdown"
          subtitle="Peak-to-trough equity decline"
          height={250}
          loading={portfolio.loading}
          empty={drawdownPoints.every(
            (point) => point.drawdown === 0,
          )}
          emptyTitle="No drawdown"
          emptyMessage="Drawdown becomes available from the equity history."
        >
          <DrawdownChart
            data={drawdownPoints}
            height={230}
          />
        </ChartCard>

        <ChartCard
          title="Fee impact"
          subtitle="Transaction costs by instrument"
          height={250}
          loading={executions.loading}
          empty={feeImpact.length === 0}
          emptyTitle="No fee data"
          emptyMessage="Fee attribution appears after executions are recorded."
        >
          <DistributionBarChart
            data={feeImpact}
            height={230}
            colorMode="single"
            baseColor={CHART_COLORS.loss}
            formatter={(value) =>
              formatCurrency(value, 2)
            }
          />
        </ChartCard>

        <Panel>
          <SectionHeader
            title="P&L ledger"
            subtitle="Current account attribution"
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <LedgerRow
              label="Realized"
              value={realizedPnl}
            />

            <LedgerRow
              label="Unrealized"
              value={unrealizedPnl}
            />

            <LedgerRow
              label="Transaction fees"
              value={-fees}
            />

            <div className="flex items-center justify-between py-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fog-500">
                Net P&L
              </span>

              <PnLIndicator
                value={totalPnl}
                size="sm"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5">
            <CircleDollarSign className="h-3.5 w-3.5 text-gold-400" />

            <span className="font-mono text-[9.5px] text-fog-500">
              Fees are included in the account-level P&L calculation.
            </span>
          </div>
        </Panel>
      </div>

      {/* =====================================================
          OPEN POSITIONS
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Open positions"
          subtitle={`${positionRows.length} instrument${
            positionRows.length === 1 ? "" : "s"
          } currently reported by the engine`}
          actions={
            <span className="font-mono text-[9.5px] text-fog-600">
              POSITION LEDGER
            </span>
          }
        />

        {positionRows.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-ink-700 px-4 py-8 text-center">
            <p className="font-mono text-xs text-fog-500">
              No open positions reported.
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-ink-700/70 text-left">
                  <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-fog-600">
                    Instrument
                  </th>

                  <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-fog-600">
                    Quantity
                  </th>

                  <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-fog-600">
                    Avg Entry
                  </th>

                  <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-fog-600">
                    Position Value
                  </th>

                  <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-fog-600">
                    Realized
                  </th>

                  <th className="px-3 py-2 text-right font-mono text-[9px] uppercase tracking-wider text-fog-600">
                    Unrealized
                  </th>
                </tr>
              </thead>

              <tbody>
                {positionRows.map((position) => {
                  const quantity =
                    toNumber(position.quantity) ?? 0;

                  const positionValue =
                    toNumber(position.positionValue) ?? 0;

                  const unrealized =
                    toNumber(position.unrealizedPnl) ?? 0;

                  const realized =
                    toNumber(position.realizedPnl) ?? 0;

                  return (
                    <tr
                      key={position.symbol}
                      className="border-b border-ink-700/40 transition-colors hover:bg-ink-800/30"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />

                          <span className="font-mono text-[11px] font-medium text-fog-200">
                            {position.symbol}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-[11px] text-fog-300">
                        {formatNumber(quantity, 0)}
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-[11px] text-fog-300">
                        {formatPrice(position.averageEntryPrice)}
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-[11px] text-fog-200">
                        {formatCurrency(positionValue, 2)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <PnLIndicator
                          value={realized}
                          size="sm"
                        />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <PnLIndicator
                          value={unrealized}
                          size="sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* =====================================================
          FOOTER STATUS
      ===================================================== */}

      <div className="flex flex-col gap-2 border-t border-ink-700/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isPreview
                ? "bg-gold-400"
                : "bg-emerald-400"
            }`}
          />

          <span className="font-mono text-[9.5px] text-fog-600">
            {isPreview
              ? "Portfolio view using preview data"
              : "Portfolio synchronized with backend"}
          </span>
        </div>

        <span className="font-mono text-[9.5px] text-fog-700">
          Last update{" "}
          {formatTimestamp(
            data?.timestamp ?? portfolio.lastUpdated,
          )}
        </span>
      </div>
    </div>
  );
}

/* ===========================================================
   Small reusable terminal components
=========================================================== */

function AccountStat({
  label,
  value,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: "gain" | "loss";
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-ink-900 px-3 py-3">
        <div className="h-2.5 w-20 animate-pulse rounded bg-ink-700" />
        <div className="mt-2 h-5 w-24 animate-pulse rounded bg-ink-800" />
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

      <div
        className={`mt-1.5 font-mono text-sm font-medium ${
          tone === "gain"
            ? "text-emerald-400"
            : tone === "loss"
              ? "text-red-400"
              : "text-fog-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function LedgerRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="font-mono text-[10px] text-fog-500">
        {label}
      </span>

      <PnLIndicator
        value={value}
        size="sm"
      />
    </div>
  );
}