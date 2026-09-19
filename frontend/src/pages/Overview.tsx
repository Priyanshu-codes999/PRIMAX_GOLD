import { useMemo } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
  Settings2,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ChartCard } from "../components/ui/ChartCard";
import { Badge, Button } from "../components/ui/Button";
import { PnLIndicator, SideBadge } from "../components/ui/Indicators";

import {
  getExecutions,
  getMarketTicks,
  getOrders,
  getPortfolio,
  getPositions,
} from "../services/backend";

import {
  previewEquityCurve,
  previewOrders,
  previewPortfolio,
  previewPositions,
  previewTicks,
} from "../services/previewData";

import { useRefreshInterval, useSourcedResource } from "../hooks/useBackend";
import { useSystemStore } from "../store/systemStore";

import {
  formatCurrency,
  formatInteger,
  formatNumber,
  formatPrice,
  formatTimestamp,
  timeAgo,
  toNumber,
} from "../utils/format";

import { equitySeries } from "../utils/chartData";
import { EquityAreaChart } from "../charts";

function KpiCard({
  label,
  value,
  secondary,
  positive,
  negative,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-700/80 bg-ink-900/70 px-4 py-4 transition-colors hover:border-ink-600">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-500">
            {label}
          </p>

          <div
            className={`mt-2 font-mono text-[22px] font-semibold tracking-tight ${
              positive
                ? "text-gain-400"
                : negative
                  ? "text-loss-400"
                  : "text-fog-100"
            }`}
          >
            {value}
          </div>

          {secondary && (
            <div className="mt-1 text-[10px] text-fog-500">
              {secondary}
            </div>
          )}
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 bg-ink-850 text-fog-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const interval = useRefreshInterval();

  const {
    apiStatus,
    apiLatencyMs,
    checkHealth,
    checking,
  } = useSystemStore();

  const portfolio = useSourcedResource(
    () => getPortfolio().then((result) => result.data),
    previewPortfolio,
    { intervalMs: interval },
  );

  const positions = useSourcedResource(
    () => getPositions().then((result) => result.data),
    previewPositions,
    { intervalMs: interval },
  );

  const orders = useSourcedResource(
    () => getOrders().then((result) => result.data),
    previewOrders,
    { intervalMs: interval },
  );

  const executions = useSourcedResource(
    () => getExecutions().then((result) => result.data),
    () => [],
    { intervalMs: interval },
  );

  const ticks = useSourcedResource(
    () => getMarketTicks().then((result) => result.data),
    previewTicks,
    { intervalMs: interval },
  );

  const portfolioData = portfolio.data?.data;
  const positionsData = positions.data?.data ?? [];
  const ordersData = orders.data?.data ?? [];
  const executionsData = executions.data?.data ?? [];
  const ticksData = ticks.data?.data ?? [];

  const equityPoints = useMemo(() => {
    const apiPoints =
      (portfolioData?.equityCurve ??
        portfolioData?.history ??
        []) as never[];

    if (Array.isArray(apiPoints) && apiPoints.length > 0) {
      return equitySeries(apiPoints);
    }

    if (portfolio.data?.source === "preview") {
      return equitySeries(previewEquityCurve());
    }

    return [];
  }, [portfolioData, portfolio.data?.source]);

  const totalRealized = positionsData.reduce(
    (sum, position) =>
      sum + (toNumber(position.realizedPnl) ?? 0),
    0,
  );

  const totalUnrealized = positionsData.reduce(
    (sum, position) =>
      sum + (toNumber(position.unrealizedPnl) ?? 0),
    0,
  );

  const openPositions = positionsData.filter(
    (position) => (toNumber(position.quantity) ?? 0) !== 0,
  ).length;

  const totalFees =
    toNumber(portfolioData?.fees) ??
    executionsData.reduce(
      (sum, execution) =>
        sum + (toNumber(execution.fee) ?? 0),
      0,
    );

  const totalPnl =
    toNumber(portfolioData?.totalPnl) ??
    totalRealized + totalUnrealized;

  const portfolioValue =
    toNumber(portfolioData?.portfolioValue) ??
    toNumber(portfolioData?.equity) ??
    0;

  const latestTick = ticksData[0];

  return (
    <div className="min-h-full space-y-5">

      {/* TOP HEADER */}
      <div className="flex flex-col gap-4 border-b border-ink-700/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
            Quantitative Trading
          </div>

          <h1 className="text-[27px] font-semibold tracking-tight text-fog-50">
            Overview
          </h1>

          <p className="mt-1 text-[12px] text-fog-500">
            Market activity, portfolio performance and execution flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 sm:flex">
            <span
              className={`h-2 w-2 rounded-full ${
                apiStatus === "connected"
                  ? "bg-gain-400"
                  : "bg-loss-400"
              }`}
            />

            <span className="text-[10px] font-medium text-fog-300">
              {apiStatus === "connected" ? "CONNECTED" : "OFFLINE"}
            </span>

            {apiLatencyMs != null && (
              <span className="font-mono text-[9px] text-fog-600">
                {Math.round(apiLatencyMs)}ms
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  checking ? "animate-spin" : ""
                }`}
              />
            }
            onClick={() => {
              portfolio.refetch();
              positions.refetch();
              orders.refetch();
              executions.refetch();
              ticks.refetch();
              void checkHealth();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* MARKET TICKER */}
      <div className="overflow-hidden rounded-xl border border-ink-700/80 bg-ink-900/70">
        <div className="flex min-w-max items-center divide-x divide-ink-700/70">
          <div className="flex items-center gap-2 px-4 py-3">
            <Search className="h-3.5 w-3.5 text-fog-600" />
            <span className="text-[11px] text-fog-500">
              Search symbols
            </span>
          </div>

          {ticksData.slice(0, 6).map((tick) => {
            const price =
              tick.mid ??
              tick.last ??
              tick.bid ??
              tick.ask ??
              0;

            return (
              <div
                key={tick.symbol}
                className="flex items-center gap-4 px-5 py-2.5"
              >
                <div>
                  <p className="font-mono text-[10px] font-semibold text-fog-300">
                    {tick.symbol}
                  </p>

                  <p className="mt-0.5 font-mono text-[12px] text-fog-100">
                    {formatPrice(price)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-mono text-[10px] text-fog-600">
                    SPREAD
                  </p>
                  <p className="font-mono text-[10px] text-fog-400">
                    {formatPrice(tick.spread)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">

        <KpiCard
          label="Portfolio Value"
          value={formatCurrency(portfolioValue, 0)}
          secondary={`Cash ${formatCurrency(portfolioData?.cash, 0)}`}
          icon={<Briefcase className="h-4 w-4" />}
        />

        <KpiCard
          label="Total P&L"
          value={<PnLIndicator value={totalPnl} size="lg" />}
          secondary="Realized + unrealized"
          positive={totalPnl >= 0}
          negative={totalPnl < 0}
          icon={<TrendingUp className="h-4 w-4" />}
        />

        <KpiCard
          label="Open Positions"
          value={formatInteger(openPositions)}
          secondary="Current exposure"
          icon={<BarChart3 className="h-4 w-4" />}
        />

        <KpiCard
          label="Fees"
          value={formatCurrency(totalFees, 0)}
          secondary="Cumulative execution cost"
          icon={<Wallet className="h-4 w-4" />}
        />

        <KpiCard
          label="Latest Market"
          value={
            latestTick
              ? formatPrice(
                  latestTick.mid ??
                    latestTick.last ??
                    latestTick.bid,
                )
              : "â€”"
          }
          secondary={latestTick?.symbol ?? "No market data"}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* MAIN CHART + WATCHLIST */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">

        <ChartCard
          title="Portfolio performance"
          subtitle="Equity progression from available portfolio history."
          height={360}
          loading={portfolio.loading}
          empty={equityPoints.length === 0}
          emptyTitle="No performance history"
          emptyMessage="Portfolio history will appear when the backend provides equity time-series data."
          actions={
            <Link
              to="/portfolio"
              className="flex items-center gap-1 text-[10px] font-medium text-gold-400 hover:text-gold-300"
            >
              Portfolio
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <EquityAreaChart
            data={equityPoints}
            dataKey="equity"
            height={340}
            baseline={
              toNumber(portfolioData?.initialCapital) ??
              undefined
            }
            baselineLabel="Initial capital"
            formatter={(value) => formatCurrency(value, 0)}
          />
        </ChartCard>

        {/* WATCHLIST */}
        <div className="overflow-hidden rounded-xl border border-ink-700/80 bg-ink-900/70">
          <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-3.5">
            <div>
              <h2 className="text-[13px] font-semibold text-fog-100">
                Watchlist
              </h2>
              <p className="mt-0.5 text-[10px] text-fog-600">
                Market snapshot
              </p>
            </div>

            <Link
              to="/markets"
              className="text-[10px] font-medium text-gold-400 hover:text-gold-300"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-ink-800/80">
            {ticksData.slice(0, 8).map((tick) => {
              const price =
                tick.mid ??
                tick.last ??
                tick.bid ??
                tick.ask ??
                0;

              return (
                <div
                  key={tick.symbol}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-ink-850"
                >
                  <div className="flex items-center gap-3">
                    <Star className="h-3 w-3 text-fog-700" />

                    <div>
                      <p className="font-mono text-[11px] font-semibold text-fog-200">
                        {tick.symbol}
                      </p>

                      <p className="mt-0.5 text-[9px] text-fog-600">
                        {tick.source ?? "MARKET"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-[11px] text-fog-200">
                      {formatPrice(price)}
                    </p>

                    <p
                      className={`mt-0.5 font-mono text-[9px] ${
                        (tick.bid ?? 0) <= (tick.ask ?? 0)
                          ? "text-fog-600"
                          : "text-fog-500"
                      }`}
                    >
                      {formatPrice(tick.spread)} spread
                    </p>
                  </div>
                </div>
              );
            })}

            {ticksData.length === 0 && (
              <div className="px-4 py-10 text-center text-[11px] text-fog-600">
                No market data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT ORDERS + POSITIONS */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* ORDERS */}
        <div className="overflow-hidden rounded-xl border border-ink-700/80 bg-ink-900/70">
          <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-3.5">
            <div>
              <h2 className="text-[13px] font-semibold text-fog-100">
                Recent Orders
              </h2>
              <p className="mt-0.5 text-[10px] text-fog-600">
                Latest order activity
              </p>
            </div>

            <Link
              to="/orders"
              className="flex items-center gap-1 text-[10px] text-gold-400"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-800">
                  {["Symbol", "Side", "Qty", "Price", "Status"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-fog-600"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {ordersData.slice(0, 6).map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-ink-800/70 hover:bg-ink-850"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] font-medium text-fog-200">
                      {order.symbol}
                    </td>

                    <td className="px-4 py-3">
                      <SideBadge side={order.side} />
                    </td>

                    <td className="px-4 py-3 font-mono text-[10px] text-fog-400">
                      {formatNumber(order.quantity, 0)}
                    </td>

                    <td className="px-4 py-3 font-mono text-[10px] text-fog-300">
                      {formatPrice(order.price)}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          order.status === "FILLED"
                            ? "gain"
                            : order.status === "REJECTED"
                              ? "loss"
                              : "neutral"
                        }
                        size="sm"
                      >
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {ordersData.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[11px] text-fog-600"
                    >
                      No orders recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* POSITIONS */}
        <div className="overflow-hidden rounded-xl border border-ink-700/80 bg-ink-900/70">
          <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-3.5">
            <div>
              <h2 className="text-[13px] font-semibold text-fog-100">
                Open Positions
              </h2>
              <p className="mt-0.5 text-[10px] text-fog-600">
                Current portfolio exposure
              </p>
            </div>

            <Link
              to="/positions"
              className="flex items-center gap-1 text-[10px] text-gold-400"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-800">
                  {["Symbol", "Qty", "Avg", "Market", "P&L"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-fog-600"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {positionsData
                  .filter(
                    (position) =>
                      (toNumber(position.quantity) ?? 0) !== 0,
                  )
                  .slice(0, 6)
                  .map((position) => {
                    const quantity =
                      toNumber(position.quantity) ?? 0;

                    const pnl =
                      toNumber(position.unrealizedPnl) ?? 0;

                    return (
                      <tr
                        key={position.symbol}
                        className="border-b border-ink-800/70 hover:bg-ink-850"
                      >
                        <td className="px-4 py-3 font-mono text-[11px] font-medium text-fog-200">
                          {position.symbol}
                        </td>

                        <td
                          className={`px-4 py-3 font-mono text-[10px] ${
                            quantity >= 0
                              ? "text-gain-400"
                              : "text-loss-400"
                          }`}
                        >
                          {formatInteger(quantity)}
                        </td>

                        <td className="px-4 py-3 font-mono text-[10px] text-fog-400">
                          {formatPrice(
                            position.averageEntryPrice,
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono text-[10px] text-fog-300">
                          {formatPrice(
                            position.marketPrice ??
                              position.lastPrice,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <PnLIndicator
                            value={pnl}
                            size="sm"
                          />
                        </td>
                      </tr>
                    );
                  })}

                {positionsData.filter(
                  (position) =>
                    (toNumber(position.quantity) ?? 0) !== 0,
                ).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[11px] text-fog-600"
                    >
                      No open positions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BOTTOM SUMMARY */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="rounded-xl border border-ink-700/70 bg-ink-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-gain-400" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-fog-600">
              Realized P&L
            </span>
          </div>

          <p className="mt-2 font-mono text-[16px] text-fog-200">
            {formatCurrency(
              portfolioData?.realizedPnl ??
                totalRealized,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-ink-700/70 bg-ink-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-gold-400" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-fog-600">
              Unrealized P&L
            </span>
          </div>

          <p className="mt-2 font-mono text-[16px] text-fog-200">
            {formatCurrency(
              portfolioData?.unrealizedPnl ??
                totalUnrealized,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-ink-700/70 bg-ink-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 text-fog-500" />
            <span className="text-[10px] uppercase tracking-[0.12em] text-fog-600">
              Last Update
            </span>
          </div>

          <p className="mt-2 font-mono text-[12px] text-fog-300">
            {portfolio.lastUpdated
              ? timeAgo(portfolio.lastUpdated)
              : "Waiting for data"}
          </p>
        </div>

      </div>
    </div>
  );
}
