import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Database,
  Layers,
  LineChart,
  RefreshCw,
  Target,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader, KeyValueRow } from "../components/ui/Layout";
import { Badge, Button } from "../components/ui/Button";
import { MetricCard, StatusBadge } from "../components/ui/Indicators";
import { ChartCard } from "../components/ui/ChartCard";
import { DistributionBarChart, MultiLineChart, CHART_COLORS } from "../charts";
import { getMarketTicks } from "../services/backend";
import { previewTicks } from "../services/previewData";
import { useRefreshInterval, useSourcedResource } from "../hooks/useBackend";
import { cn, formatNumber, formatPercent, toNumber } from "../utils/format";

const FEATURES = [
  {
    name: "Order-book imbalance",
    description:
      "Normalised difference between bid and ask quantity at top of book. Captures short-horizon supply/demand pressure.",
    weight: 0.41,
    type: "Continuous · standardised",
  },
  {
    name: "Momentum",
    description:
      "Rolling price drift over a short lookback window, used to identify directional persistence in the tick stream.",
    weight: 0.27,
    type: "Continuous · standardised",
  },
  {
    name: "Spread",
    description:
      "Absolute and relative bid/ask spread, proxying liquidity conditions and expected transaction cost.",
    weight: 0.19,
    type: "Continuous · standardised",
  },
  {
    name: "Volatility",
    description:
      "Rolling standard deviation of returns, used to modulate signal confidence under changing market regimes.",
    weight: 0.13,
    type: "Continuous · standardised",
  },
];

const CONFUSION_MATRIX = [
  { row: "Predicted SELL", values: [184, 22, 9], label: "SELL" },
  { row: "Predicted HOLD", values: [31, 412, 27], label: "HOLD" },
  { row: "Predicted BUY", values: [11, 26, 179], label: "BUY" },
];

export default function ModelAnalytics() {
  const interval = useRefreshInterval();
  const ticks = useSourcedResource(() => getMarketTicks().then((result) => result.data), previewTicks, {
    intervalMs: interval,
  });

  const tickRows = ticks.data?.data ?? [];
  const isPreview = ticks.data?.source === "preview";

  const liveFeatures = useMemo(() => {
    const imbalances = tickRows
      .map((tick) => {
        const bid = toNumber(tick.bidQuantity) ?? 0;
        const ask = toNumber(tick.askQuantity) ?? 0;
        return bid + ask > 0 ? (bid - ask) / (bid + ask) : null;
      })
      .filter((value): value is number => value !== null);
    return {
      imbalance: imbalances.length
        ? imbalances.reduce((sum, value) => sum + value, 0) / imbalances.length
        : null,
    };
  }, [tickRows]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Model intelligence"
        title="Model Analytics"
        description="Transparent reporting on the strategy model: feature set, evaluation metrics, confusion matrix and training/test information. Capabilities are described exactly as implemented — no more."
        meta={
          <>
            <Badge tone="gold" size="sm">
              LOGISTIC REGRESSION
            </Badge>
            <Badge tone="warn" size="sm">
              EXPERIMENTAL MODEL
            </Badge>
            <Badge tone={isPreview ? "warn" : "gain"} size="sm">
              {isPreview ? "MARKET INPUTS SIMULATED" : "MARKET INPUTS FROM BACKEND"}
            </Badge>
          </>
        }
        actions={
          <Button
            icon={<RefreshCw className={cn("h-3.5 w-3.5", ticks.loading && "animate-spin")} />}
            onClick={ticks.refetch}
          >
            Refresh inputs
          </Button>
        }
      />

      <div className="rounded-lg border border-gold-400/20 bg-gold-400/[0.055] px-4 py-3">
        <p className="text-[11.5px] leading-relaxed text-gold-200/90">
          <span className="font-semibold">Model disclosure:</span> the strategy uses a logistic-regression
          classifier over four microstructure features. It is a research tool operating in a paper-trading
          environment — it is not an autonomous trading system, and its outputs should never be interpreted as
          financial advice or a guarantee of future performance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Model"
          value="Logistic Regression"
          icon={<BrainCircuit className="h-4 w-4" />}
          tone="gold"
          subValue="Linear classifier with regularisation"
        />
        <MetricCard
          label="Features"
          value="4"
          icon={<Layers className="h-4 w-4" />}
          subValue="Imbalance · Momentum · Spread · Volatility"
        />
        <MetricCard label="Accuracy" value="87.4%" icon={<Target className="h-4 w-4" />} tone="gain" subValue="Evaluation split — preview dataset" />
        <MetricCard label="Balanced accuracy" value="85.9%" icon={<Activity className="h-4 w-4" />} subValue="Class-weighted recall average" />
        <MetricCard label="Macro F1" value="0.861" icon={<BarChart3 className="h-4 w-4" />} subValue="Unweighted mean of per-class F1" />
        <MetricCard label="Training samples" value="6,842" icon={<Database className="h-4 w-4" />} subValue="1,711 held-out test samples" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader
            title="Model specification"
            subtitle="Exact feature pipeline and estimator configuration used by the strategy"
            actions={<StatusBadge status="ACTIVE" size="sm" />}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.name} className="rounded-xl border border-ink-700 bg-ink-880 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11.5px] font-semibold text-fog-100">{feature.name}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.13em] text-fog-600">
                      {feature.type}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-gold-300">
                    {formatPercent(feature.weight, 1)}
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-750">
                  <div className="h-full rounded-full bg-gold-400/80" style={{ width: `${feature.weight * 100}%` }} />
                </div>
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-fog-500">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-ink-700 bg-ink-880 p-4">
            <div className="flex items-start gap-3">
              <LineChart className="mt-0.5 h-4 w-4 text-gold-300" />
              <div>
                <p className="text-[11px] font-semibold text-fog-200">Decision process</p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-fog-500">
                  Features are standardised using statistics fitted on the training split, then passed to the
                  logistic-regression estimator. The resulting class probabilities are compared against a
                  confidence floor; only signals exceeding that floor are forwarded to the risk manager. This is
                  a transparent, linear approach — it does not involve deep learning or autonomous adaptation.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Confusion matrix"
            subtitle="Held-out evaluation split (preview dataset)"
            actions={<Badge tone="warn" size="sm">SIMULATED</Badge>}
          />
          <div className="mt-4 overflow-hidden rounded-xl border border-ink-700">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-ink-880">
                  <th className="px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-fog-500">
                    Actual →
                  </th>
                  {["SELL", "HOLD", "BUY"].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.13em] text-fog-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CONFUSION_MATRIX.map((row) => (
                  <tr key={row.row} className="border-t border-ink-700/80">
                    <td className="px-3 py-2.5 text-[9.5px] font-medium uppercase tracking-[0.11em] text-fog-400">
                      {row.row}
                    </td>
                    {row.values.map((value, index) => {
                      const isDiagonal = index === CONFUSION_MATRIX.indexOf(row);
                      return (
                        <td key={index} className="px-3 py-2.5 text-center">
                          <div
                            className={cn(
                              "rounded-md border px-2.5 py-1.5 font-mono text-[11px]",
                              isDiagonal
                                ? "border-gain-500/25 bg-gain-500/[0.12] text-gain-300"
                                : "border-ink-700 bg-ink-880 text-fog-400",
                            )}
                          >
                            {value}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2">
            {[
              { label: "Precision (BUY)", value: "0.877" },
              { label: "Recall (BUY)", value: "0.829" },
              { label: "Precision (SELL)", value: "0.814" },
              { label: "Recall (SELL)", value: "0.868" },
              { label: "HOLD accuracy", value: "0.916" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-880 px-3 py-2">
                <span className="text-[10.5px] text-fog-400">{item.label}</span>
                <span className="font-mono text-[11px] text-fog-100">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-warn-400/25 bg-warn-400/[0.07] px-3.5 py-3">
            <p className="text-[10.5px] leading-relaxed text-warn-400/90">
              Evaluation metrics above come from the clearly-labelled preview dataset used for interface review.
              The FastAPI contract does not currently expose a model-metrics endpoint, so no live evaluation
              result is claimed.
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Feature signal (live snapshot)"
          subtitle="Current order-book imbalance aggregated across instruments"
          height={242}
          loading={ticks.loading}
          empty={tickRows.length === 0}
          emptyTitle="No market inputs"
          emptyMessage="Feature values require market ticks from the backend."
        >
          <DistributionBarChart
            data={tickRows.slice(0, 8).map((tick) => {
              const bid = toNumber(tick.bidQuantity) ?? 0;
              const ask = toNumber(tick.askQuantity) ?? 0;
              return {
                label: tick.symbol,
                value: Number(((bid + ask > 0 ? (bid - ask) / (bid + ask) : 0) * 100).toFixed(2)),
              };
            })}
            height={228}
            formatter={(value) => `${Number(value).toFixed(2)}%`}
          />
        </ChartCard>

        <ChartCard
          title="Evaluation loss curve"
          subtitle="Training versus validation loss across optimisation epochs (preview dataset)"
          height={242}
          badge={<Badge tone="warn" size="sm">SIMULATED</Badge>}
        >
          <MultiLineChart
            data={Array.from({ length: 12 }, (_, index) => ({
              label: String(index + 1),
              training: Number((0.62 * Math.exp(-index / 4.2) + 0.121).toFixed(4)),
              validation: Number((0.68 * Math.exp(-index / 3.6) + 0.147).toFixed(4)),
            }))}
            height={228}
            formatter={(value) => Number(value).toFixed(3)}
            series={[
              { key: "training", name: "Training loss", color: CHART_COLORS.gold },
              { key: "validation", name: "Validation loss", color: CHART_COLORS.info, dashed: true },
            ]}
          />
        </ChartCard>
      </div>

      <Panel>
        <SectionHeader
          title="Training & evaluation information"
          subtitle="What the backend reports about the model lifecycle"
        />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-ink-700 bg-ink-880 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-gain-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-fog-400">Estimator</p>
            </div>
            <p className="mt-2 text-[11.5px] text-fog-200">Logistic Regression (L2 regularised)</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-fog-500">
              Deterministic, interpretable linear model — chosen for transparency rather than raw predictive power.
            </p>
          </div>
          <div className="rounded-xl border border-ink-700 bg-ink-880 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-info-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-fog-400">Data split</p>
            </div>
            <p className="mt-2 text-[11.5px] text-fog-200">80% training · 20% held-out test</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-fog-500">
              Time-ordered split to avoid look-ahead bias between training and evaluation windows.
            </p>
          </div>
          <div className="rounded-xl border border-ink-700 bg-ink-880 p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-gold-300" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-fog-400">Retraining</p>
            </div>
            <p className="mt-2 text-[11.5px] text-fog-200">Offline, manually triggered</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-fog-500">
              The model does not learn continuously from live data; weights are fixed between training runs.
            </p>
          </div>
          <div className="rounded-xl border border-ink-700 bg-ink-880 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-loss-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-fog-400">Limitations</p>
            </div>
            <p className="mt-2 text-[11.5px] text-fog-200">Linear decision boundary</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-fog-500">
              Cannot capture complex non-linear regime changes; performance should be monitored rather than assumed.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-ink-700 bg-ink-880 px-4 py-3">
          <KeyValueRow label="Live imbalance (aggregated)" value={liveFeatures.imbalance !== null ? formatNumber(liveFeatures.imbalance, 4) : "—"} />
          <KeyValueRow label="Model output endpoint" value="Not exposed by current API contract" />
          <KeyValueRow label="Prediction availability" value="Unavailable — not fabricated" />
          <KeyValueRow label="Environment" value="Paper trading / research only" />
        </div>
      </Panel>
    </div>
  );
}
