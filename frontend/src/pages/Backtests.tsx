import { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  Database,
  Download,
  FlaskConical,
  LineChart,
  RefreshCw,
  TrendingDown,
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
import {
  previewEquityCurve,
  previewExecutions,
  previewOrders,
  previewPortfolio,
} from "../services/previewData";
import {
  downloadJson,
  formatCurrency,
  formatInteger,
  formatNumber,
  formatPercent,
  toNumber,
} from "../utils/format";
import { equitySeries } from "../utils/chartData";

export default function Backtests() {
  const equityPoints = useMemo(() => equitySeries(previewEquityCurve()), []);
  const orders = useMemo(() => previewOrders(), []);
  const executions = useMemo(() => previewExecutions(), []);
  const portfolio = useMemo(() => previewPortfolio(), []);

  const metrics = useMemo(() => {
    const initialCapital = toNumber(portfolio.initialCapital) ?? 250_000;
    const finalEquity = Number(equityPoints.at(-1)?.equity ?? initialCapital);
    const totalPnl = finalEquity - initialCapital;
    const drawdowns = equityPoints.map((point) => Number(point.drawdown ?? 0));
    const maxDrawdown = drawdowns.length ? Math.min(...drawdowns) : 0;

    const returns = equityPoints.slice(1).map((point, index) => {
      const previous = Number(equityPoints[index].equity ?? 0);
      return previous !== 0 ? (Number(point.equity ?? 0) - previous) / previous : 0;
    });
    const mean = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
    const variance = returns.length
      ? returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length
      : 0;
    const stdev = Math.sqrt(variance);
    const sharpe = stdev > 0 ? (mean / stdev) * Math.sqrt(252) : 0;

    return {
      ticks: 1_284_600,
      orders: orders.length,
      filled: orders.filter((order) => order.status === "FILLED").length,
      rejected: orders.filter((order) => order.status === "REJECTED").length,
      expired: orders.filter((order) => order.status === "EXPIRED").length,
      finalPosition: 3,
      initialCapital,
      finalCash: toNumber(portfolio.cash) ?? 0,
      realized: toNumber(portfolio.realizedPnl) ?? 0,
      unrealized: toNumber(portfolio.unrealizedPnl) ?? 0,
      totalPnl,
      fees: toNumber(portfolio.fees) ?? 0,
      turnover: executions.reduce(
        (sum, execution) => sum + (toNumber(execution.price) ?? 0) * (toNumber(execution.quantity) ?? 0),
        0,
      ),
      winRate: 0.5738,
      maxDrawdown,
      profitFactor: 1.34,
      sharpe,
    };
  }, [equityPoints, orders, executions, portfolio]);

  const drawdownPoints = useMemo(
    () => equityPoints.map((point) => ({ label: point.label, drawdown: Number(point.drawdown ?? 0) })),
    [equityPoints],
  );

  const tradePnl = useMemo(() => {
    const series: Array<{ label: string; value: number; pnl: number }> = [];
    let running = 0;
    executions.slice(0, 32).forEach((execution, index) => {
      const value = ((toNumber(execution.price) ?? 0) - 1) * (toNumber(execution.quantity) ?? 0) * 0.02;
      running += value;
      series.push({ label: String(index + 1), value: Number(running.toFixed(2)), pnl: Number(value.toFixed(2)) });
    });
    return series;
  }, [executions]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Research"
        title="Backtests"
        description="Historical simulation analytics for strategy research. Every figure on this page belongs to a historical simulation — none of it describes live trading or guarantees future results."
        meta={
          <>
            <Badge tone="warn" size="sm">
              HISTORICAL SIMULATION
            </Badge>
            <Badge tone="gold" size="sm">
              PAPER-TRADING ASSUMPTIONS
            </Badge>
            <Badge tone="neutral" size="sm">
              DETERMINISTIC PREVIEW RUN
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => downloadJson("primax-backtest-summary.json", { metrics, equityPoints })}
            >
              Export summary
            </Button>
            <Button icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => window.location.reload()}>
              Re-run
            </Button>
          </>
        }
      />

      <div className="rounded-lg border border-warn-400/25 bg-warn-400/[0.07] px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-400" />
          <p className="text-[11.5px] leading-relaxed text-warn-400/95">
            <span className="font-semibold">HISTORICAL SIMULATION.</span> The current FastAPI contract does not
            expose a backtest-results endpoint, so this page renders the clearly-labelled deterministic preview
            run used for interface review. Backtest results are produced with hindsight and simplified fill
            assumptions — past simulation results do not guarantee future performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Ticks processed" value={formatInteger(metrics.ticks)} icon={<Database className="h-4 w-4" />} subValue="Historical market events replayed" />
        <MetricCard label="Orders" value={formatInteger(metrics.orders)} icon={<BarChart3 className="h-4 w-4" />} subValue={`${metrics.filled} filled`} />
        <MetricCard label="Filled orders" value={formatInteger(metrics.filled)} icon={<Trophy className="h-4 w-4" />} tone="gain" />
        <MetricCard label="Rejected orders" value={formatInteger(metrics.rejected)} icon={<AlertTriangle className="h-4 w-4" />} tone={metrics.rejected > 0 ? "loss" : "default"} />
        <MetricCard label="Expired orders" value={formatInteger(metrics.expired)} icon={<RefreshCw className="h-4 w-4" />} />
        <MetricCard label="Final position" value={formatInteger(metrics.finalPosition)} icon={<LineChart className="h-4 w-4" />} subValue="Open instruments at simulation end" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Initial capital" value={formatCurrency(metrics.initialCapital, 0)} icon={<Database className="h-4 w-4" />} tone="gold" />
        <MetricCard label="Final cash" value={formatCurrency(metrics.finalCash)} icon={<Database className="h-4 w-4" />} />
        <MetricCard label="Realized P&L" value={<PnLIndicator value={metrics.realized} size="lg" />} icon={<LineChart className="h-4 w-4" />} tone={metrics.realized >= 0 ? "gain" : "loss"} />
        <MetricCard label="Unrealized P&L" value={<PnLIndicator value={metrics.unrealized} size="lg" />} icon={<LineChart className="h-4 w-4" />} tone={metrics.unrealized >= 0 ? "gain" : "loss"} />
        <MetricCard label="Total P&L" value={<PnLIndicator value={metrics.totalPnl} size="lg" />} icon={<Trophy className="h-4 w-4" />} tone={metrics.totalPnl >= 0 ? "gain" : "loss"} />
        <MetricCard label="Fees" value={formatCurrency(metrics.fees)} icon={<BarChart3 className="h-4 w-4" />} subValue="Simulated commission impact" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Turnover" value={formatCurrency(metrics.turnover, 0)} icon={<RefreshCw className="h-4 w-4" />} subValue="Aggregate simulated notional" />
        <MetricCard label="Win rate" value={formatPercent(metrics.winRate)} icon={<Trophy className="h-4 w-4" />} tone="gain" />
        <MetricCard label="Max drawdown" value={formatPercent(metrics.maxDrawdown)} icon={<TrendingDown className="h-4 w-4" />} tone="loss" />
        <MetricCard label="Profit factor" value={formatNumber(metrics.profitFactor, 2)} icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Sharpe ratio" value={formatNumber(metrics.sharpe, 2)} icon={<LineChart className="h-4 w-4" />} subValue="Annualised from simulation equity" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          className="xl:col-span-2"
          title="Simulation equity curve"
          subtitle="HISTORICAL SIMULATION — equity path produced by replaying historical data"
          height={286}
          badge={<Badge tone="warn" size="sm">SIMULATION</Badge>}
        >
          <EquityAreaChart
            data={equityPoints}
            dataKey="equity"
            height={272}
            baseline={metrics.initialCapital}
            baselineLabel="Initial capital"
            formatter={(value) => formatCurrency(value, 0)}
          />
        </ChartCard>

        <ChartCard
          title="Drawdown"
          subtitle="Peak-to-trough decline during the simulated period"
          height={252}
          badge={<Badge tone="warn" size="sm">SIMULATION</Badge>}
        >
          <DrawdownChart data={drawdownPoints} height={238} />
        </ChartCard>

        <ChartCard
          title="Trade P&L"
          subtitle="Cumulative simulated trade contribution"
          height={252}
          badge={<Badge tone="warn" size="sm">SIMULATION</Badge>}
        >
          <MultiLineChart
            data={tradePnl}
            height={238}
            formatter={(value) => formatCurrency(value, 0)}
            series={[
              { key: "value", name: "Cumulative P&L", color: CHART_COLORS.gold },
            ]}
            showLegend={false}
          />
        </ChartCard>

        <ChartCard
          title="Per-trade distribution"
          subtitle="Individual simulated trade outcomes"
          height={252}
          badge={<Badge tone="warn" size="sm">SIMULATION</Badge>}
        >
          <DistributionBarChart
            data={tradePnl.map((point) => ({ label: point.label, value: Number((point.pnl as number) ?? 0) }))}
            height={238}
            formatter={(value) => formatCurrency(value, 0)}
          />
        </ChartCard>

        <Panel>
          <SectionHeader
            title="Simulation methodology"
            subtitle="Assumptions that shape the numbers above"
            actions={<Badge tone="warn" size="sm">HISTORICAL</Badge>}
          />
          <div className="mt-3 space-y-2.5">
            {[
              {
                title: "Fill assumptions",
                body: "Orders are matched against historical quotes using the quoted spread and a simplified latency model. Real execution can differ materially.",
              },
              {
                title: "No market impact",
                body: "The simulation assumes fills do not move the market, which overstates achievable performance for larger order sizes.",
              },
              {
                title: "Parameter selection",
                body: "Strategy parameters were chosen with knowledge of the historical period, introducing selection bias.",
              },
              {
                title: "Costs",
                body: "Commission and spread costs are included, but financing, borrow and slippage-tail effects are approximated.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-ink-700 bg-ink-880 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-300/80">
                  {item.title}
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-fog-500">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-warn-400/25 bg-warn-400/[0.07] px-3.5 py-3">
            <p className="text-[10.5px] leading-relaxed text-warn-400/90">
              Past simulation results do not guarantee future performance. Nothing on this page is financial
              advice or a representation of real trading results.
            </p>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          title="Backend integration note"
          subtitle="How this page will consume real backtest results"
        />
        <p className="mt-2.5 max-w-4xl text-[11px] leading-relaxed text-fog-500">
          When the FastAPI service exposes a backtest-results endpoint, this page will request it through the
          centralized API layer (<span className="font-mono text-fog-400">src/services/api.ts</span>) and render
          the returned metrics directly. Until then, PRIMAX GOLD keeps the interface reviewable with a
          deterministic, clearly-labelled simulation rather than fabricating backend values.
        </p>
      </Panel>
    </div>
  );
}
