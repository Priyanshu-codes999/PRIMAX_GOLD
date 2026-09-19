import { useMemo } from "react";
import {
  BarChart3,
  Download,
  Gauge,
  LineChart,
  Percent,
  RefreshCw,
  Scale,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader } from "../components/ui/Layout";
import { Badge, Button } from "../components/ui/Button";
import { MetricCard, PnLIndicator } from "../components/ui/Indicators";
import { ChartCard } from "../components/ui/ChartCard";
import {
  DistributionBarChart,
  DrawdownChart,
  EquityAreaChart,
  MultiLineChart,
  CHART_COLORS,
} from "../charts";
import { getExecutions, getPortfolio, getPositions } from "../services/backend";
import {
  previewEquityCurve,
  previewExecutions,
  previewPortfolio,
  previewPositions,
} from "../services/previewData";
import { useRefreshInterval, useSourcedResource } from "../hooks/useBackend";
import {
  cn,
  downloadJson,
  formatCurrency,
  formatLatency,
  formatNumber,
  formatPercent,
  toNumber,
} from "../utils/format";
import { equitySeries } from "../utils/chartData";

function computeStats(values: number[]) {
  if (values.length === 0) return { mean: 0, stdev: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1);
  return { mean, stdev: Math.sqrt(variance) };
}

export default function Performance() {
  const interval = useRefreshInterval();
  const portfolio = useSourcedResource(() => getPortfolio().then((result) => result.data), previewPortfolio, {
    intervalMs: interval,
  });
  const positions = useSourcedResource(() => getPositions().then((result) => result.data), previewPositions, {
    intervalMs: interval,
  });
  const executions = useSourcedResource(
    () => getExecutions().then((result) => result.data),
    previewExecutions,
    { intervalMs: interval },
  );

  const data = portfolio.data?.data;
  const positionRows = positions.data?.data ?? [];
  const executionRows = executions.data?.data ?? [];
  const isPreview = portfolio.data?.source === "preview";

  const equityPoints = useMemo(() => {
    const apiPoints = (data?.equityCurve ?? data?.history ?? []) as never[];
    if (Array.isArray(apiPoints) && apiPoints.length > 0) return equitySeries(apiPoints);
    if (portfolio.data?.source === "preview") return equitySeries(previewEquityCurve());
    return [];
  }, [data, portfolio.data?.source]);

  const metrics = useMemo(() => {
    const initialCapital = toNumber(data?.initialCapital) ?? 250_000;
    const totalPnl = toNumber(data?.totalPnl) ?? 0;
    const totalReturn = initialCapital !== 0 ? totalPnl / initialCapital : 0;

    const returns = equityPoints.slice(1).map((point, index) => {
      const previous = Number(equityPoints[index].equity ?? 0);
      return previous !== 0 ? (Number(point.equity ?? 0) - previous) / previous : 0;
    });
    const { mean, stdev } = computeStats(returns);
    const sharpe = stdev > 0 ? (mean / stdev) * Math.sqrt(252) : 0;

    const drawdowns = equityPoints.map((point) => Number(point.drawdown ?? 0));
    const maxDrawdown = drawdowns.length ? Math.min(...drawdowns) : 0;

    const tradePnls = positionRows
      .map((row) => toNumber(row.realizedPnl) ?? 0)
      .filter((value) => value !== 0);
    const wins = tradePnls.filter((value) => value > 0);
    const losses = tradePnls.filter((value) => value < 0);
    const grossProfit = wins.reduce((sum, value) => sum + value, 0);
    const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
    const winRate = tradePnls.length > 0 ? wins.length / tradePnls.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0;

    const notional = executionRows.reduce(
      (sum, row) => sum + (toNumber(row.price) ?? 0) * (toNumber(row.quantity) ?? 0),
      0,
    );
    const fees = toNumber(data?.fees) ?? executionRows.reduce((sum, row) => sum + (toNumber(row.fee) ?? 0), 0);
    const latencies = executionRows
      .map((row) => toNumber(row.latencyNs))
      .filter((value): value is number => value !== null && Number.isFinite(value));

    return {
      totalReturn,
      totalPnl,
      winRate,
      profitFactor,
      sharpe,
      maxDrawdown,
      avgTradePnl: tradePnls.length > 0 ? tradePnls.reduce((a, b) => a + b, 0) / tradePnls.length : 0,
      winningTrades: wins.length,
      losingTrades: losses.length,
      totalTrades: tradePnls.length,
      turnover: notional,
      fees,
      avgLatency: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
    };
  }, [data, equityPoints, positionRows, executionRows]);

  const drawdownPoints = useMemo(
    () => equityPoints.map((point) => ({ label: point.label, drawdown: Number(point.drawdown ?? 0) })),
    [equityPoints],
  );

  const cumulativePnl = useMemo(() => {
    let running = 0;
    return equityPoints.map((point) => {
      running += Number(point.pnl ?? 0);
      return { label: point.label, value: Number(running.toFixed(2)) };
    });
  }, [equityPoints]);

  const pnlDistribution = useMemo(() => {
    const values = positionRows
      .map((row) => toNumber(row.realizedPnl) ?? 0)
      .filter((value) => value !== 0);
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const buckets = 11;
    const width = (max - min) / buckets || 1;
    return Array.from({ length: buckets }, (_, index) => {
      const lower = min + index * width;
      const upper = lower + width;
      return {
        label: `${(lower / 1000).toFixed(1)}k`,
        value: values.filter((value) =>
          index === buckets - 1 ? value >= lower && value <= upper : value >= lower && value < upper,
        ).length,
      };
    });
  }, [positionRows]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quantitative analytics"
        title="Performance"
        description="Simulation performance statistics derived from the currently available backend data: return profile, risk-adjusted metrics, drawdown behaviour and trade-level distributions."
        meta={
          <>
            <Badge tone="warn" size="sm">
              SIMULATION / PAPER-TRADING RESULTS
            </Badge>
            <Badge tone={isPreview ? "warn" : "gain"} size="sm">
              {isPreview ? "INCLUDES PREVIEW DATASET" : "BACKEND DATA"}
            </Badge>
            <span className="font-mono text-[10.5px] text-fog-500">
              Past simulation results do not guarantee future performance.
            </span>
          </>
        }
        actions={
          <>
            <Button
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => downloadJson("primax-performance.json", { metrics, equityPoints })}
            >
              Export metrics
            </Button>
            <Button
              icon={<RefreshCw className={cn( portfolio.loading && "animate-spin", "h-3.5 w-3.5")} />}
              onClick={() => {
                portfolio.refetch();
                positions.refetch();
                executions.refetch();
              }}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Total return"
          value={formatPercent(metrics.totalReturn)}
          icon={<Percent className="h-4 w-4" />}
          tone={metrics.totalReturn >= 0 ? "gain" : "loss"}
          subValue={`On initial capital ${formatCurrency(data?.initialCapital, 0)}`}
          loading={portfolio.loading}
        />
        <MetricCard
          label="Total P&L"
          value={<PnLIndicator value={metrics.totalPnl} size="lg" />}
          icon={<TrendingUp className="h-4 w-4" />}
          tone={metrics.totalPnl >= 0 ? "gain" : "loss"}
          loading={portfolio.loading}
        />
        <MetricCard
          label="Win rate"
          value={formatPercent(metrics.winRate)}
          icon={<Target className="h-4 w-4" />}
          subValue={`${metrics.winningTrades} winning · ${metrics.losingTrades} losing trades`}
          loading={positions.loading}
        />
        <MetricCard
          label="Profit factor"
          value={Number.isFinite(metrics.profitFactor) ? formatNumber(metrics.profitFactor, 2) : "∞"}
          icon={<Scale className="h-4 w-4" />}
          subValue="Gross profit ÷ gross loss"
          loading={positions.loading}
        />
        <MetricCard
          label="Sharpe ratio"
          value={formatNumber(metrics.sharpe, 2)}
          icon={<Gauge className="h-4 w-4" />}
          subValue="Annualised from the equity series"
          loading={portfolio.loading}
        />
        <MetricCard
          label="Max drawdown"
          value={formatPercent(metrics.maxDrawdown)}
          icon={<TrendingDown className="h-4 w-4" />}
          tone="loss"
          subValue="Peak-to-trough equity decline"
          loading={portfolio.loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-7">
        <MetricCard label="Avg trade P&L" value={formatCurrency(metrics.avgTradePnl)} icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Winning trades" value={formatNumber(metrics.winningTrades, 0)} icon={<Trophy className="h-4 w-4" />} tone="gain" />
        <MetricCard label="Losing trades" value={formatNumber(metrics.losingTrades, 0)} icon={<TrendingDown className="h-4 w-4" />} tone="loss" />
        <MetricCard label="Total trades" value={formatNumber(metrics.totalTrades, 0)} icon={<LineChart className="h-4 w-4" />} />
        <MetricCard label="Turnover" value={formatCurrency(metrics.turnover, 0)} icon={<RefreshCw className="h-4 w-4" />} subValue="Aggregate executed notional" />
        <MetricCard label="Fees" value={formatCurrency(metrics.fees)} icon={<Timer className="h-4 w-4" />} />
        <MetricCard
          label="Avg latency"
          value={metrics.avgLatency !== null ? formatLatency(metrics.avgLatency, "ns") : "—"}
          icon={<Timer className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Equity curve"
          subtitle="Simulated account equity with initial-capital reference"
          height={286}
          loading={portfolio.loading}
          empty={equityPoints.length === 0}
          emptyTitle="No equity series"
          emptyMessage="Equity analytics require a time series from the backend."
        >
          <EquityAreaChart
            data={equityPoints}
            dataKey="equity"
            height={272}
            baseline={toNumber(data?.initialCapital) ?? undefined}
            baselineLabel="Initial capital"
            formatter={(value) => formatCurrency(value, 0)}
          />
        </ChartCard>

        <ChartCard
          title="Drawdown"
          subtitle="Percentage decline from the running equity peak"
          height={286}
          loading={portfolio.loading}
          empty={drawdownPoints.every((point) => point.drawdown === 0)}
          emptyTitle="No drawdown data"
          emptyMessage="Drawdown is derived from the equity series."
        >
          <DrawdownChart data={drawdownPoints} height={272} />
        </ChartCard>

        <ChartCard
          title="Trade P&L distribution"
          subtitle="Frequency of realized trade outcomes"
          height={252}
          loading={positions.loading}
          empty={pnlDistribution.length === 0}
          emptyTitle="No realized trades"
          emptyMessage="The distribution populates once realized P&L values are reported."
        >
          <DistributionBarChart data={pnlDistribution} height={238} colorMode="single" baseColor={CHART_COLORS.gold} />
        </ChartCard>

        <ChartCard
          title="Cumulative P&L"
          subtitle="Running total of reported profit and loss"
          height={252}
          loading={portfolio.loading}
          empty={cumulativePnl.length === 0}
          emptyTitle="No P&L history"
          emptyMessage="Cumulative P&L requires historical data."
        >
          <MultiLineChart
            data={cumulativePnl}
            height={238}
            formatter={(value) => formatCurrency(value, 0)}
            series={[{ key: "value", name: "Cumulative P&L", color: CHART_COLORS.gain }]}
            showLegend={false}
          />
        </ChartCard>
      </div>

      <Panel>
        <SectionHeader
          title="Methodology & limitations"
          subtitle="How the statistics on this page are produced"
          actions={<Badge tone="warn" size="sm">SIMULATION</Badge>}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Data source",
              body: "Metrics are computed from /api/portfolio, /api/positions and /api/executions. Where those endpoints return no history, the affected statistic is shown as unavailable rather than estimated.",
            },
            {
              title: "Risk-adjusted measures",
              body: "The Sharpe ratio is annualised from periodic equity returns assuming 252 trading periods per year. It is an approximation suited to simulation review, not a production risk figure.",
            },
            {
              title: "Drawdown",
              body: "Drawdown is measured peak-to-trough on the reported equity series. Shorter histories will understate true peak-to-trough behaviour.",
            },
            {
              title: "No performance guarantee",
              body: "Simulation and backtest outcomes are produced with the benefit of hindsight and simplified fill assumptions. They do not guarantee future performance.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-ink-700 bg-ink-880 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-300/80">{item.title}</p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-fog-500">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
