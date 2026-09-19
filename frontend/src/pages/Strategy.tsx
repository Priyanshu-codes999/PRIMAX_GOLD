import { useMemo, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  Database,
  GitBranch,
  Info,
  LineChart,
  Lock,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Target,
  Waves,
  Zap,
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

import { ChartCard } from "../components/ui/ChartCard";

import {
  EmptyState,
  UnavailableState,
} from "../components/ui/States";

import {
  MultiLineChart,
  CHART_COLORS,
} from "../charts";

import {
  getMarketTicks,
  getPortfolio,
} from "../services/backend";

import {
  previewEquityCurve,
  previewPortfolio,
  previewTicks,
} from "../services/previewData";

import {
  useRefreshInterval,
  useSourcedResource,
} from "../hooks/useBackend";

import {
  cn,
  formatNumber,
  formatPrice,
  toNumber,
} from "../utils/format";

import { equitySeries } from "../utils/chartData";

/* =========================================================
   PIPELINE
========================================================= */

interface PipelineStage {
  id: string;
  title: string;
  description: string;
  icon: typeof Database;
  detail: string;
  status: "active" | "derived" | "future";
}

const PIPELINE: PipelineStage[] = [
  {
    id: "market-data",
    title: "Market Data",
    description:
      "Raw quotes, depth and market ticks enter the strategy layer.",
    icon: Database,
    detail:
      "GET /api/market-ticks · WebSocket /ws",
    status: "active",
  },
  {
    id: "features",
    title: "Feature Engine",
    description:
      "Microstructure observations are transformed into model features.",
    icon: Settings2,
    detail:
      "Imbalance · Momentum · Spread · Volatility",
    status: "derived",
  },
  {
    id: "model",
    title: "ML Model",
    description:
      "The classifier estimates directional probabilities from the feature vector.",
    icon: BrainCircuit,
    detail:
      "Logistic Regression · ONNX",
    status: "active",
  },
  {
    id: "signal",
    title: "Signal Layer",
    description:
      "Model probabilities are converted into BUY, SELL or HOLD states.",
    icon: Target,
    detail:
      "Probability threshold · Confidence",
    status: "active",
  },
  {
    id: "risk",
    title: "Risk Manager",
    description:
      "Every proposed instruction is checked against configured risk limits.",
    icon: ShieldCheck,
    detail:
      "Quantity · Position · Notional · Kill switch",
    status: "active",
  },
  {
    id: "oms",
    title: "OMS",
    description:
      "Validated instructions move through the order state machine.",
    icon: GitBranch,
    detail:
      "Order lifecycle · Reconciliation",
    status: "active",
  },
  {
    id: "execution",
    title: "Execution",
    description:
      "The execution layer models spread, depth, slippage and latency.",
    icon: Zap,
    detail:
      "Fill simulation · Latency",
    status: "active",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    description:
      "Fills update positions, cash, fees and mark-to-market P&L.",
    icon: Activity,
    detail:
      "Portfolio · Positions · Executions",
    status: "active",
  },
];

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  label,
  value,
  display,
  description,
  available,
  tone = "gold",
}: {
  label: string;
  value: number | null;
  display: string;
  description: string;
  available: boolean;
  tone?: "gold" | "gain" | "loss" | "info";
}) {
  const normalized =
    value === null
      ? 0
      : Math.min(1, Math.abs(value));

  return (
    <div className="rounded-lg border border-ink-700/70 bg-ink-900/70 p-3.5 transition-colors hover:border-gold-400/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog-600">
            {label}
          </p>

          <p className="mt-2 font-mono text-[18px] leading-none text-fog-100">
            {available ? display : "—"}
          </p>
        </div>

        <StatusBadge
          status={
            available
              ? "ACTIVE"
              : "UNAVAILABLE"
          }
          size="sm"
        />
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-700">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            tone === "gold" && "bg-gold-400",
            tone === "gain" && "bg-gain-400",
            tone === "loss" && "bg-loss-400",
            tone === "info" && "bg-info-400",
          )}
          style={{
            width: `${Math.max(
              2,
              normalized * 100,
            )}%`,
          }}
        />
      </div>

      <p className="mt-2.5 text-[10px] leading-relaxed text-fog-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   PIPELINE STAGE
========================================================= */

function PipelineStageCard({
  stage,
  index,
}: {
  stage: PipelineStage;
  index: number;
}) {
  const Icon = stage.icon;

  return (
    <div className="relative">
      <div
        className={cn(
          "h-full rounded-lg border p-3.5",
          stage.status === "future"
            ? "border-dashed border-ink-600 bg-ink-900/40"
            : "border-ink-700/70 bg-ink-900/70 hover:border-gold-400/20",
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gold-400/20 bg-gold-400/[0.07] text-gold-300">
            <Icon className="h-3.5 w-3.5" />
          </div>

          <span className="font-mono text-[8.5px] uppercase tracking-[0.15em] text-fog-700">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <h3 className="mt-3 text-[11.5px] font-semibold text-fog-100">
          {stage.title}
        </h3>

        <p className="mt-1.5 text-[10px] leading-relaxed text-fog-500">
          {stage.description}
        </p>

        <div className="mt-3 border-t border-ink-700/60 pt-2.5">
          <p className="font-mono text-[8.5px] uppercase tracking-wider text-fog-700">
            {stage.detail}
          </p>
        </div>
      </div>

      {index < PIPELINE.length - 1 ? (
        <div className="flex justify-center py-1.5 xl:hidden">
          <ArrowDown className="h-3 w-3 text-gold-400/40" />
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   STRATEGY PAGE
========================================================= */

export default function Strategy() {
  const interval = useRefreshInterval();

  const ticks = useSourcedResource(
    () =>
      getMarketTicks().then(
        (result) => result.data,
      ),
    previewTicks,
    {
      intervalMs: interval,
    },
  );

  const portfolio = useSourcedResource(
    () =>
      getPortfolio().then(
        (result) => result.data,
      ),
    previewPortfolio,
    {
      intervalMs: interval,
    },
  );

  const tickRows = ticks.data?.data ?? [];
  const isPreview =
    ticks.data?.source === "preview";

  /* =========================================================
     FEATURE CALCULATION
  ========================================================= */

  const features = useMemo(() => {
    const spreads = tickRows
      .map((tick) => toNumber(tick.spread))
      .filter(
        (value): value is number =>
          value !== null,
      );

    const mids = tickRows
      .map((tick) =>
        toNumber(
          tick.mid ?? tick.last,
        ),
      )
      .filter(
        (value): value is number =>
          value !== null,
      );

    const imbalances = tickRows
      .map((tick) => {
        const bid =
          toNumber(
            tick.bidQuantity,
          ) ?? 0;

        const ask =
          toNumber(
            tick.askQuantity,
          ) ?? 0;

        return bid + ask > 0
          ? (bid - ask) /
              (bid + ask)
          : null;
      })
      .filter(
        (value): value is number =>
          value !== null,
      );

    const latest =
      tickRows.length > 0
        ? tickRows[
            tickRows.length - 1
          ]
        : null;

    const latestMid = latest
      ? toNumber(
          latest.mid ??
            latest.last,
        )
      : null;

    const latestSpread = latest
      ? toNumber(latest.spread)
      : null;

    const latestBid =
      latest
        ? toNumber(
            latest.bidQuantity,
          )
        : null;

    const latestAsk =
      latest
        ? toNumber(
            latest.askQuantity,
          )
        : null;

    const latestImbalance =
      latestBid !== null &&
      latestAsk !== null &&
      latestBid + latestAsk > 0
        ? (latestBid - latestAsk) /
          (latestBid + latestAsk)
        : null;

    return {
      avgSpread:
        spreads.length > 0
          ? spreads.reduce(
              (a, b) => a + b,
              0,
            ) / spreads.length
          : null,

      avgMid:
        mids.length > 0
          ? mids.reduce(
              (a, b) => a + b,
              0,
            ) / mids.length
          : null,

      imbalance:
        latestImbalance ??
        (imbalances.length > 0
          ? imbalances.reduce(
              (a, b) => a + b,
              0,
            ) / imbalances.length
          : null),

      latestMid,
      latestSpread,
    };
  }, [tickRows]);

  /* =========================================================
     EQUITY
  ========================================================= */

  const equityPoints = useMemo(() => {
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

  /* =========================================================
     PORTFOLIO METRICS
  ========================================================= */

  const portfolioData =
    portfolio.data?.data;

  const totalPnl =
    toNumber(
      portfolioData?.totalPnl,
    ) ?? 0;

  const equity =
    toNumber(
      portfolioData?.equity ??
        portfolioData?.portfolioValue,
    ) ?? 0;

  const initialCapital =
    toNumber(
      portfolioData?.initialCapital,
    ) ?? 0;

  const returnPct =
    initialCapital > 0
      ? (totalPnl /
          initialCapital) *
        100
      : null;

  return (
    <div className="space-y-4">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-ink-700/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-400">
              Quant Research
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
                ? "PREVIEW INPUTS"
                : "BACKEND INPUTS"}
            </Badge>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-fog-100">
            Strategy
          </h1>

          <p className="mt-1 max-w-3xl text-xs text-fog-500">
            Feature engineering, model research and signal
            pipeline for the quantitative execution stack.
          </p>
        </div>

        <Button
          icon={
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                ticks.loading &&
                  "animate-spin",
              )}
            />
          }
          onClick={() => {
            ticks.refetch();
            portfolio.refetch();
          }}
        >
          Refresh
        </Button>
      </div>

      {/* =====================================================
          RESEARCH NOTICE
      ===================================================== */}

      <div className="rounded-lg border border-gold-400/15 bg-gold-400/[0.035] px-4 py-3">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300" />

          <p className="text-[10.5px] leading-relaxed text-fog-400">
            Strategy outputs are research signals. The current
            API does not expose live model inference, so PRIMAX
            GOLD intentionally does not fabricate BUY/SELL
            predictions or confidence values.
          </p>
        </div>
      </div>

      {/* =====================================================
          LIVE INPUT SNAPSHOT
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Strategy input snapshot"
          subtitle="Latest market observations available to the strategy layer"
          actions={
            <Badge
              tone={
                tickRows.length > 0
                  ? "gain"
                  : "neutral"
              }
              size="sm"
            >
              {tickRows.length > 0
                ? `${tickRows.length} TICKS`
                : "NO TICKS"}
            </Badge>
          }
        />

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/70 bg-ink-700/50 md:grid-cols-4">
          <Snapshot
            label="Mid / Last"
            value={
              features.latestMid !== null
                ? formatPrice(
                    features.latestMid,
                  )
                : "—"
            }
            icon={
              <Activity className="h-3.5 w-3.5" />
            }
          />

          <Snapshot
            label="Spread"
            value={
              features.latestSpread !==
              null
                ? formatPrice(
                    features.latestSpread,
                  )
                : "—"
            }
            icon={
              <Waves className="h-3.5 w-3.5" />
            }
          />

          <Snapshot
            label="Imbalance"
            value={
              features.imbalance !==
              null
                ? formatNumber(
                    features.imbalance,
                    4,
                  )
                : "—"
            }
            icon={
              <LineChart className="h-3.5 w-3.5" />
            }
          />

          <Snapshot
            label="Data state"
            value={
              isPreview
                ? "PREVIEW"
                : "CONNECTED"
            }
            icon={
              <Database className="h-3.5 w-3.5" />
            }
          />
        </div>
      </Panel>

      {/* =====================================================
          FEATURES
      ===================================================== */}

      <div>
        <SectionHeader
          title="Feature vector"
          subtitle="Inputs used by the quantitative strategy"
          actions={
            <span className="font-mono text-[9px] text-fog-700">
              4 FEATURES
            </span>
          }
        />

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            label="Order-book imbalance"
            value={
              features.imbalance
            }
            display={
              features.imbalance !==
              null
                ? formatNumber(
                    features.imbalance,
                    4,
                  )
                : "—"
            }
            description="(Bid quantity − ask quantity) / total displayed quantity."
            available={
              features.imbalance !==
              null
            }
            tone="gain"
          />

          <FeatureCard
            label="Momentum"
            value={null}
            display="—"
            description="Requires a historical price sequence from the backend. Not fabricated from a single snapshot."
            available={false}
            tone="gold"
          />

          <FeatureCard
            label="Spread"
            value={
              features.avgSpread !==
                null &&
              features.avgMid !==
                null &&
              features.avgMid !== 0
                ? features.avgSpread /
                  features.avgMid
                : null
            }
            display={
              features.avgSpread !==
              null
                ? formatPrice(
                    features.avgSpread,
                  )
                : "—"
            }
            description="Observed bid/ask spread from the market-data feed."
            available={
              features.avgSpread !==
              null
            }
            tone="info"
          />

          <FeatureCard
            label="Volatility"
            value={null}
            display="—"
            description="Requires a historical return series. The UI does not substitute an invented volatility value."
            available={false}
            tone="loss"
          />
        </div>
      </div>

      {/* =====================================================
          MODEL / SIGNAL
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader
            title="Model state"
            subtitle="Current ML strategy configuration"
            actions={
              <Badge
                tone="gold"
                size="sm"
              >
                EXPERIMENTAL
              </Badge>
            }
          />

          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/70 bg-ink-700/50 lg:grid-cols-4">
            <ModelStat
              label="Model"
              value="Logistic Regression"
              icon={
                <BrainCircuit className="h-3.5 w-3.5" />
              }
            />

            <ModelStat
              label="Inputs"
              value="4 features"
              icon={
                <Settings2 className="h-3.5 w-3.5" />
              }
            />

            <ModelStat
              label="Output"
              value="3-class"
              icon={
                <Target className="h-3.5 w-3.5" />
              }
            />

            <ModelStat
              label="Runtime"
              value="ONNX"
              icon={
                <Zap className="h-3.5 w-3.5" />
              }
            />
          </div>

          <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-900/50 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog-600">
                  Research validation
                </p>

                <p className="mt-1.5 text-[12px] font-medium text-fog-200">
                  Simulator dataset validation
                </p>
              </div>

              <StatusBadge
                status="RESEARCH"
                size="sm"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <ResearchMetric
                label="Accuracy"
                value="87.4%"
              />

              <ResearchMetric
                label="Balanced accuracy"
                value="87.4%"
              />

              <ResearchMetric
                label="Macro F1"
                value="87.5%"
              />
            </div>

            <p className="mt-3 text-[9.5px] leading-relaxed text-fog-600">
              These metrics describe the generated/simulated
              dataset used during model validation. They are not
              live-market accuracy measurements.
            </p>
          </div>
        </Panel>

        {/* Signal panel */}
        <Panel>
          <SectionHeader
            title="Current signal"
            subtitle="Backend inference state"
            actions={
              <StatusBadge
                status="UNAVAILABLE"
                size="sm"
              />
            }
          />

          <div className="mt-3">
            <UnavailableState
              title="Inference endpoint unavailable"
              message="The current FastAPI contract does not expose model prediction output. No synthetic BUY, SELL or HOLD signal is displayed."
            />
          </div>

          <div className="mt-3 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Prediction"
              value="—"
            />

            <KeyValueRow
              label="Confidence"
              value="—"
            />

            <KeyValueRow
              label="Threshold"
              value="Not exposed"
            />

            <KeyValueRow
              label="Last inference"
              value="—"
            />

            <KeyValueRow
              label="Model version"
              value="—"
            />
          </div>

          <div className="mt-3 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-fog-600" />

              <p className="font-mono text-[9px] leading-relaxed text-fog-600">
                Signal display activates once inference
                results are served by the backend.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* =====================================================
          RESEARCH EQUITY
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Strategy equity"
          subtitle="Research-track equity trajectory"
          height={285}
          loading={portfolio.loading}
          empty={equityPoints.length === 0}
          emptyTitle="No strategy equity"
          emptyMessage="Equity history will appear when strategy performance is recorded."
        >
          <MultiLineChart
            data={equityPoints}
            height={260}
            formatter={(value) =>
              formatNumber(value, 0)
            }
            series={[
              {
                key: "equity",
                name: "Strategy equity",
                color:
                  CHART_COLORS.gold,
              },
            ]}
            showLegend={false}
          />
        </ChartCard>

        <Panel>
          <SectionHeader
            title="Strategy performance"
            subtitle="Current portfolio state"
          />

          <div className="mt-3 divide-y divide-ink-700/60">
            <KeyValueRow
              label="Equity"
              value={
                equity > 0
                  ? formatNumber(
                      equity,
                      2,
                    )
                  : "—"
              }
            />

            <KeyValueRow
              label="Total P&L"
              value={
                totalPnl !== 0
                  ? formatNumber(
                      totalPnl,
                      2,
                    )
                  : "0.00"
              }
            />

            <KeyValueRow
              label="Return"
              value={
                returnPct !== null
                  ? `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`
                  : "—"
              }
            />

            <KeyValueRow
              label="Initial capital"
              value={
                initialCapital > 0
                  ? formatNumber(
                      initialCapital,
                      2,
                    )
                  : "—"
              }
            />
          </div>

          <div className="mt-4 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5">
            <p className="text-[9.5px] leading-relaxed text-fog-600">
              Portfolio performance is displayed separately
              from ML validation metrics. A high classification
              score does not imply positive trading returns.
            </p>
          </div>
        </Panel>
      </div>

      {/* =====================================================
          PIPELINE
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Strategy pipeline"
          subtitle="Signal-to-execution architecture"
          actions={
            <Badge
              tone="neutral"
              size="sm"
            >
              {PIPELINE.length} STAGES
            </Badge>
          }
        />

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE.map(
            (stage, index) => (
              <PipelineStageCard
                key={stage.id}
                stage={stage}
                index={index}
              />
            ),
          )}
        </div>

        <div className="mt-4 hidden items-center justify-center gap-2 xl:flex">
          {PIPELINE.map(
            (stage, index) => (
              <div
                key={stage.id}
                className="flex items-center gap-2"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    stage.status ===
                      "active"
                      ? "bg-gold-400"
                      : "bg-fog-700",
                  )}
                />

                {index <
                PIPELINE.length -
                  1 ? (
                  <ArrowRight className="h-3 w-3 text-fog-700" />
                ) : null}
              </div>
            ),
          )}
        </div>
      </Panel>

      {/* =====================================================
          CONFIGURATION
      ===================================================== */}

      <Panel>
        <SectionHeader
          title="Strategy configuration"
          subtitle="Current architectural contract"
        />

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ConfigCard
            label="Signal generation"
            value="Probability threshold"
            detail="Model probabilities are intended to be converted into directional states only after the configured confidence threshold is met."
          />

          <ConfigCard
            label="Feature layer"
            value="Microstructure"
            detail="Order-book imbalance, momentum, spread and volatility form the intended model feature vector."
          />

          <ConfigCard
            label="Risk gate"
            value="Pre-trade validation"
            detail="Quantity, position and notional constraints are evaluated before instructions reach the OMS."
          />

          <ConfigCard
            label="Execution"
            value="Spread + latency"
            detail="The execution layer models quoted spread, available depth, slippage and latency."
          />
        </div>
      </Panel>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-fog-600">
          <span className="text-gold-300">
            Research note:
          </span>{" "}
          strategy features and portfolio trajectories shown
          here are for system research and simulation. ML
          validation metrics are dataset-specific and should
          not be interpreted as live-market performance.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SNAPSHOT
========================================================= */

function Snapshot({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-ink-900 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
          {label}
        </span>

        <span className="text-fog-700">
          {icon}
        </span>
      </div>

      <p className="mt-1.5 font-mono text-sm font-medium text-fog-100">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   MODEL STAT
========================================================= */

function ModelStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-ink-900 px-3 py-3">
      <div className="flex items-center gap-2 text-fog-600">
        {icon}

        <span className="font-mono text-[9px] uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-1.5 font-mono text-[11px] text-fog-200">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   RESEARCH METRIC
========================================================= */

function ResearchMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-ink-700/60 bg-ink-900 px-3 py-2.5">
      <p className="font-mono text-[8.5px] uppercase tracking-wider text-fog-600">
        {label}
      </p>

      <p className="mt-1 font-mono text-sm text-fog-100">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   CONFIG CARD
========================================================= */

function ConfigCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-ink-700/70 bg-ink-900/70 p-3.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-fog-600">
        {label}
      </p>

      <p className="mt-1.5 text-[11.5px] font-medium text-fog-200">
        {value}
      </p>

      <p className="mt-1.5 text-[10px] leading-relaxed text-fog-600">
        {detail}
      </p>
    </div>
  );
}