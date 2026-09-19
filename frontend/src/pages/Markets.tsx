import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowDownUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Radio,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Waves,
} from "lucide-react";

import { Panel, SectionHeader } from "../components/ui/Layout";
import { Badge, Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Indicators";
import { ChartCard } from "../components/ui/ChartCard";
import { EmptyState } from "../components/ui/States";
import { ConnectionIndicator } from "../components/ui/Status";
import { SegmentedControl } from "../components/ui/Controls";

import {
  DistributionBarChart,
  EquityAreaChart,
  MultiLineChart,
  CHART_COLORS,
} from "../charts";

import { getMarketTicks } from "../services/backend";
import { previewTicks } from "../services/previewData";
import {
  useRefreshInterval,
  useSourcedResource,
} from "../hooks/useBackend";
import { useSocket } from "../hooks/useSocket";
import { useSystemStore } from "../store/systemStore";

import {
  cn,
  formatNumber,
  formatPrice,
  formatTimestamp,
  mulberry32,
  timeAgo,
  toNumber,
} from "../utils/format";

import type { MarketTick } from "../types";

type ChartWindow = "1H" | "6H" | "24H";

interface HistoryPoint {
  label: string;
  price: number;
  spread: number;
  bidQty: number;
  askQty: number;
  imbalance: number;
}

/**
 * Maintains a small in-memory history from observed market ticks.
 * No synthetic values are added when backend data is available.
 */
function useTickHistory(ticks: MarketTick[], preview: boolean) {
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>(
    {},
  );

  const lastSignature = useRef<string>("");

  useEffect(() => {
    const signature = ticks
      .map(
        (tick) =>
          `${tick.symbol}:${tick.timestamp ?? tick.last ?? ""}`,
      )
      .join("|");

    if (!signature || signature === lastSignature.current) {
      return;
    }

    lastSignature.current = signature;

    setHistory((previous) => {
      const next = { ...previous };

      ticks.forEach((tick) => {
        const price = toNumber(
          tick.mid ?? tick.last ?? tick.bid ?? tick.ask,
        );

        if (price === null) {
          return;
        }

        const bidQty = toNumber(tick.bidQuantity) ?? 0;
        const askQty = toNumber(tick.askQuantity) ?? 0;

        const point: HistoryPoint = {
          label:
            tick.timestamp ?? new Date().toISOString(),
          price,
          spread: toNumber(tick.spread) ?? 0,
          bidQty,
          askQty,
          imbalance:
            bidQty + askQty > 0
              ? (bidQty - askQty) / (bidQty + askQty)
              : 0,
        };

        const existing = next[tick.symbol] ?? [];

        const alreadyPresent = existing.some(
          (item) =>
            item.label === point.label &&
            Math.abs(item.price - point.price) < 1e-9,
        );

        if (!alreadyPresent) {
          next[tick.symbol] = [
            ...existing,
            point,
          ].slice(-120);
        }
      });

      return next;
    });
  }, [ticks]);

  /**
   * Preview mode only.
   * Deterministic series keeps the interface usable when the API
   * is unavailable. It is clearly labelled as simulated elsewhere.
   */
  return useMemo(() => {
    if (!preview) {
      return history;
    }

    const generated: Record<string, HistoryPoint[]> = {};

    ticks.forEach((tick, tickIndex) => {
      const base =
        toNumber(tick.mid ?? tick.last) ?? 100;

      const rng = mulberry32(
        1000 + tickIndex * 97,
      );

      const now = Date.now();

      generated[tick.symbol] = Array.from(
        { length: 90 },
        (_, index) => {
          const drift =
            Math.sin(index / 9 + tickIndex) *
              base *
              0.0016 +
            (rng() - 0.5) *
              base *
              0.0012;

          const price = base + drift;

          const spread =
            base * 0.00012 +
            rng() * base * 0.00006;

          const bidQty =
            800_000 + rng() * 900_000;

          const askQty =
            800_000 + rng() * 900_000;

          return {
            label: new Date(
              now -
                (90 - index) *
                  4 *
                  60_000,
            ).toISOString(),
            price: Number(
              price.toFixed(5),
            ),
            spread: Number(
              spread.toFixed(5),
            ),
            bidQty,
            askQty,
            imbalance:
              (bidQty - askQty) /
              (bidQty + askQty),
          };
        },
      );
    });

    return generated;
  }, [preview, history, ticks]);
}

function QuoteValue({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "gain" | "loss" | "gold";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-fog-600">
        {label}
      </p>

      <p
        className={cn(
          "mt-1 truncate font-mono text-[13px] font-medium",
          tone === "gain" && "text-gain-400",
          tone === "loss" && "text-loss-400",
          tone === "gold" && "text-gold-300",
          tone === "neutral" && "text-fog-100",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function WatchlistRow({
  tick,
  selected,
  onSelect,
}: {
  tick: MarketTick;
  selected: boolean;
  onSelect: () => void;
}) {
  const price =
    tick.mid ?? tick.last ?? tick.bid ?? tick.ask;

  const bid = toNumber(tick.bid);
  const ask = toNumber(tick.ask);
  const mid = toNumber(price);

  const spread =
    toNumber(tick.spread) ??
    (bid !== null && ask !== null
      ? ask - bid
      : null);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full border-b border-ink-800/80 px-3 py-2.5 text-left transition-colors last:border-b-0",
        selected
          ? "bg-gold-400/[0.07]"
          : "hover:bg-ink-800/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              selected
                ? "bg-gold-400"
                : "bg-fog-700",
            )}
          />

          <span
            className={cn(
              "truncate font-mono text-[10.5px] font-medium",
              selected
                ? "text-gold-200"
                : "text-fog-300",
            )}
          >
            {tick.symbol}
          </span>
        </div>

        <span className="font-mono text-[10.5px] text-fog-100">
          {formatPrice(price)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[8.5px] text-fog-600">
          SPR {formatPrice(spread)}
        </span>

        <span className="font-mono text-[8.5px] text-fog-600">
          VOL {formatNumber(
            tick.volume,
            0,
            { compact: true },
          )}
        </span>
      </div>

      {mid !== null && bid !== null && ask !== null ? (
        <div className="mt-1 flex items-center gap-2 font-mono text-[8px]">
          <span className="text-gain-400">
            B {formatPrice(bid)}
          </span>

          <span className="text-fog-700">
            /
          </span>

          <span className="text-loss-400">
            A {formatPrice(ask)}
          </span>
        </div>
      ) : null}
    </button>
  );
}

export default function Markets() {
  const interval = useRefreshInterval();

  const socket = useSocket();

  const {
    apiStatus,
    checkHealth,
    checking,
  } = useSystemStore();

  const [selectedSymbol, setSelectedSymbol] =
    useState<string | null>(null);

  const [window_, setWindow] =
    useState<ChartWindow>("6H");

  const [search, setSearch] =
    useState("");

  const ticks = useSourcedResource(
    () =>
      getMarketTicks().then(
        (result) => result.data,
      ),
    previewTicks,
    {
      intervalMs: interval ?? 10000,
    },
  );

  const tickList =
    ticks.data?.data ?? [];

  const isPreview =
    ticks.data?.source === "preview";

  const history =
    useTickHistory(
      tickList,
      isPreview,
    );

  const symbol =
    tickList.find(
      (tick) => tick.symbol === "XAUUSD",
    )?.symbol ??
    selectedSymbol ??
    tickList[0]?.symbol ??
    null;

  const activeTick =
    tickList.find(
      (tick) =>
        tick.symbol === symbol,
    ) ?? null;

  const symbolHistory =
    symbol
      ? history[symbol] ?? []
      : [];

  const windowPoints = useMemo(() => {
    const limits: Record<
      ChartWindow,
      number
    > = {
      "1H": 18,
      "6H": 54,
      "24H": 90,
    };

    return symbolHistory.slice(
      -limits[window_],
    );
  }, [symbolHistory, window_]);

  const filteredTicks =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return tickList;
      }

      return tickList.filter((tick) =>
        tick.symbol
          .toLowerCase()
          .includes(query),
      );
    }, [tickList, search]);

  const spreadBps =
    activeTick?.mid &&
    activeTick.spread !== null &&
    activeTick.spread !== undefined
      ? (
          (activeTick.spread /
            activeTick.mid) *
          10000
        ).toFixed(2)
      : null;

  const imbalance =
    activeTick &&
    (toNumber(activeTick.bidQuantity) ?? 0) +
      (toNumber(activeTick.askQuantity) ?? 0) >
      0
      ? (
          ((toNumber(
            activeTick.bidQuantity,
          ) ?? 0) -
            (toNumber(
              activeTick.askQuantity,
            ) ?? 0)) /
          ((toNumber(
            activeTick.bidQuantity,
          ) ?? 0) +
            (toNumber(
              activeTick.askQuantity,
            ) ?? 0))
        )
      : null;

  return (
    <div className="space-y-4">

      {/* =========================================================
          TERMINAL HEADER
      ========================================================== */}
      <div className="border-b border-ink-700/80 pb-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Radio
                className={cn(
                  "h-3.5 w-3.5",
                  socket.status === "connected"
                    ? "text-gain-400"
                    : "text-fog-600",
                )}
              />

              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-fog-600">
                Market Terminal
              </span>

              <span className="text-fog-700">
                /
              </span>

              <span className="font-mono text-[10px] text-gold-300">
                {symbol ?? "NO SYMBOL"}
              </span>
            </div>

            <div className="mt-2 flex items-end gap-3">
              <h1 className="font-mono text-xl font-semibold tracking-tight text-fog-100 sm:text-2xl">
                {activeTick
                  ? formatPrice(
                      activeTick.mid ??
                        activeTick.last,
                    )
                  : "â€”"}
              </h1>

              {activeTick && (
                <div className="mb-0.5 flex items-center gap-1 text-[10px] text-fog-500">
                  <Activity className="h-3 w-3" />
                  Live tick stream
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                isPreview
                  ? "warn"
                  : "gain"
              }
              size="sm"
            >
              {isPreview
                ? "SIMULATED FEED"
                : "BACKEND FEED"}
            </Badge>

            <ConnectionIndicator
              status={
                socket.status ===
                "connected"
                  ? "connected"
                  : socket.status ===
                      "connecting"
                    ? "connecting"
                    : "disconnected"
              }
              label="WebSocket"
              compact
            />

            <ConnectionIndicator
              status={
                apiStatus ===
                "connected"
                  ? "connected"
                  : "disconnected"
              }
              label="API"
              compact
            />

            <Button
              icon={
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    (ticks.loading ||
                      checking) &&
                      "animate-spin",
                  )}
                />
              }
              onClick={() => {
                ticks.refetch();
                void checkHealth();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================
          QUOTE STRIP
      ========================================================== */}
      {activeTick ? (
        <Panel
          padded={false}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-2 divide-x divide-ink-700/70 sm:grid-cols-4 xl:grid-cols-8">

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Bid"
                value={formatPrice(
                  activeTick.bid,
                )}
                tone="gain"
              />
            </div>

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Ask"
                value={formatPrice(
                  activeTick.ask,
                )}
                tone="loss"
              />
            </div>

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Spread"
                value={formatPrice(
                  activeTick.spread,
                )}
              />
            </div>

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Spread bps"
                value={
                  spreadBps
                    ? `${spreadBps} bps`
                    : "â€”"
                }
                tone="gold"
              />
            </div>

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Bid Depth"
                value={formatNumber(
                  activeTick.bidQuantity,
                  0,
                  { compact: true },
                )}
                tone="gain"
              />
            </div>

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Ask Depth"
                value={formatNumber(
                  activeTick.askQuantity,
                  0,
                  { compact: true },
                )}
                tone="loss"
              />
            </div>

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Imbalance"
                value={
                  imbalance !== null
                    ? imbalance.toFixed(3)
                    : "â€”"
                }
                tone={
                  imbalance !== null &&
                  imbalance > 0
                    ? "gain"
                    : imbalance !== null &&
                        imbalance < 0
                      ? "loss"
                      : "neutral"
                }
              />
            </div>

            <div className="px-3.5 py-3">
              <QuoteValue
                label="Volume"
                value={formatNumber(
                  activeTick.volume,
                  0,
                  { compact: true },
                )}
              />
            </div>
          </div>
        </Panel>
      ) : null}

      {/* =========================================================
          MAIN TERMINAL
      ========================================================== */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">

        {/* Main chart */}
        <Panel
          padded={false}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-3 border-b border-ink-700/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-gold-300" />

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-200">
                  {symbol ?? "Market"} Price
                </h2>

                {isPreview && (
                  <Badge
                    tone="warn"
                    size="sm"
                  >
                    SIMULATED
                  </Badge>
                )}
              </div>

              <p className="mt-1 text-[9.5px] text-fog-600">
                {isPreview
                  ? "Synthetic interface data"
                  : "Observed backend tick history"}
              </p>
            </div>

            <SegmentedControl
              size="sm"
              value={window_}
              onChange={setWindow}
              options={[
                {
                  value: "1H",
                  label: "1H",
                },
                {
                  value: "6H",
                  label: "6H",
                },
                {
                  value: "24H",
                  label: "24H",
                },
              ]}
            />
          </div>

          <div className="px-2 pb-2 pt-1 sm:px-3">
            <ChartCard
              title=""
              subtitle=""
              height={390}
              loading={ticks.loading}
              empty={
                windowPoints.length ===
                0
              }
              emptyTitle="Waiting for price history"
              emptyMessage="Price history accumulates as market ticks arrive."
            >
              <EquityAreaChart
                data={windowPoints.map(
                  (point) => ({
                    label: point.label,
                    price: point.price,
                  }),
                )}
                dataKey="price"
                height={370}
                color={
                  CHART_COLORS.gold
                }
                formatter={(value) =>
                  formatPrice(value)
                }
              />
            </ChartCard>
          </div>
        </Panel>

        {/* Watchlist */}
        <Panel
          padded={false}
          className="overflow-hidden"
        >
          <div className="border-b border-ink-700/70 px-3.5 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fog-300">
                  Watchlist
                </p>

                <p className="mt-1 text-[9px] text-fog-600">
                  {tickList.length} instruments
                </p>
              </div>

              <SlidersHorizontal className="h-3.5 w-3.5 text-fog-600" />
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-fog-600" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Filter symbols"
                className="h-8 w-full rounded-md border border-ink-700 bg-ink-900 pl-7 pr-2.5 text-[10px] text-fog-200 outline-none placeholder:text-fog-700 focus:border-gold-400/30"
              />
            </div>
          </div>

          <div className="max-h-[385px] overflow-y-auto">
            {filteredTicks.length ===
            0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[10px] text-fog-600">
                  No instruments
                </p>
              </div>
            ) : (
              filteredTicks.map(
                (tick) => (
                  <WatchlistRow
                    key={tick.symbol}
                    tick={tick}
                    selected={
                      tick.symbol ===
                      symbol
                    }
                    onSelect={() =>
                      setSelectedSymbol(
                        tick.symbol,
                      )
                    }
                  />
                ),
              )
            )}
          </div>
        </Panel>
      </div>

      {/* =========================================================
          MICROSTRUCTURE ANALYTICS
      ========================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <Panel
          padded={false}
          className="overflow-hidden"
        >
          <div className="border-b border-ink-700/70 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <ArrowDownUp className="h-3.5 w-3.5 text-fog-500" />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-300">
                  Spread
                </p>

                <p className="mt-1 text-[9px] text-fog-600">
                  Bid / ask distance
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <ChartCard
              title=""
              subtitle=""
              height={190}
              loading={ticks.loading}
              empty={windowPoints.length === 0}
              emptyTitle="No spread history"
              emptyMessage="Spread data will appear as ticks arrive."
            >
              <EquityAreaChart
                data={windowPoints.map(
                  (point) => ({
                    label: point.label,
                    spread:
                      point.spread,
                  }),
                )}
                dataKey="spread"
                height={170}
                color={
                  CHART_COLORS.info
                }
                formatter={(value) =>
                  formatPrice(value)
                }
              />
            </ChartCard>
          </div>
        </Panel>

        <Panel
          padded={false}
          className="overflow-hidden"
        >
          <div className="border-b border-ink-700/70 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-fog-500" />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-300">
                  Top-of-book Depth
                </p>

                <p className="mt-1 text-[9px] text-fog-600">
                  Bid versus ask quantity
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <ChartCard
              title=""
              subtitle=""
              height={190}
              loading={ticks.loading}
              empty={windowPoints.length === 0}
              emptyTitle="No depth history"
              emptyMessage="Depth data will populate as market data arrives."
            >
              <MultiLineChart
                data={windowPoints.map(
                  (point) => ({
                    label:
                      point.label,
                    bid:
                      point.bidQty,
                    ask:
                      point.askQty,
                  }),
                )}
                height={170}
                formatter={(value) =>
                  formatNumber(
                    value,
                    0,
                    {
                      compact: true,
                    },
                  )
                }
                series={[
                  {
                    key: "bid",
                    name: "Bid",
                    color:
                      CHART_COLORS.gain,
                  },
                  {
                    key: "ask",
                    name: "Ask",
                    color:
                      CHART_COLORS.loss,
                  },
                ]}
              />
            </ChartCard>
          </div>
        </Panel>

        <Panel
          padded={false}
          className="overflow-hidden"
        >
          <div className="border-b border-ink-700/70 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Waves className="h-3.5 w-3.5 text-fog-500" />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-300">
                  Order Imbalance
                </p>

                <p className="mt-1 text-[9px] text-fog-600">
                  Bid pressure versus ask pressure
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <ChartCard
              title=""
              subtitle=""
              height={190}
              loading={ticks.loading}
              empty={windowPoints.length === 0}
              emptyTitle="No imbalance data"
              emptyMessage="Requires bid and ask quantity data."
            >
              <DistributionBarChart
                data={windowPoints.map(
                  (point) => ({
                    label:
                      point.label,
                    value:
                      Number(
                        point.imbalance.toFixed(
                          4,
                        ),
                      ),
                  }),
                )}
                height={170}
                formatter={(value) =>
                  Number(value).toFixed(2)
                }
              />
            </ChartCard>
          </div>
        </Panel>
      </div>

      {/* =========================================================
          MARKET DATA TABLE
      ========================================================== */}
      <Panel
        padded={false}
        className="overflow-hidden"
      >
        <div className="border-b border-ink-700/70 px-4 py-3.5">
          <SectionHeader
            title="Market Data"
            subtitle="Live instrument state received from the market-data service"
            actions={
              <div className="flex items-center gap-3">
                <span className="hidden font-mono text-[9px] text-fog-600 sm:inline">
                  {ticks.lastUpdated
                    ? `Updated ${timeAgo(
                        ticks.lastUpdated,
                      )}`
                    : "Awaiting data"}
                </span>

                <div className="flex items-center gap-1.5">
                  <Radio className="h-3 w-3 text-fog-600" />

                  <span className="font-mono text-[9px] text-fog-500">
                    {tickList.length} instruments
                  </span>
                </div>
              </div>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="bg-ink-880">
                {[
                  "Symbol",
                  "Bid",
                  "Ask",
                  "Spread",
                  "Mid",
                  "Bid Qty",
                  "Ask Qty",
                  "Volume",
                  "Timestamp",
                  "Source",
                  "Status",
                ].map(
                  (header, index) => (
                    <th
                      key={header}
                      className={cn(
                        "border-b border-ink-700 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-fog-500",
                        index > 0 &&
                          index < 8 &&
                          "text-right",
                      )}
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {ticks.loading &&
              tickList.length === 0 ? (
                Array.from({
                  length: 6,
                }).map((_, index) => (
                  <tr key={index}>
                    <td
                      colSpan={11}
                      className="px-4 py-2.5"
                    >
                      <div className="shimmer h-6 rounded" />
                    </td>
                  </tr>
                ))
              ) : tickList.length ===
                0 ? (
                <tr>
                  <td colSpan={11}>
                    <EmptyState
                      compact
                      title="No market data"
                      message="The market-data endpoint returned an empty dataset."
                    />
                  </td>
                </tr>
              ) : (
                tickList.map(
                  (tick) => {
                    const bid =
                      toNumber(
                        tick.bid,
                      );

                    const ask =
                      toNumber(
                        tick.ask,
                      );

                    const spread =
                      toNumber(
                        tick.spread,
                      ) ??
                      (bid !== null &&
                      ask !== null
                        ? ask - bid
                        : null);

                    return (
                      <tr
                        key={tick.symbol}
                        onClick={() =>
                          setSelectedSymbol(
                            tick.symbol,
                          )
                        }
                        className={cn(
                          "cursor-pointer border-b border-ink-800/80 transition-colors hover:bg-ink-800/50",
                          tick.symbol ===
                            symbol &&
                            "bg-gold-400/[0.045]",
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                tick.symbol ===
                                  symbol
                                  ? "bg-gold-400"
                                  : "bg-fog-700",
                              )}
                            />

                            <span className="font-mono text-[11px] font-medium text-fog-100">
                              {tick.symbol}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-gain-400">
                          {formatPrice(
                            tick.bid,
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-loss-400">
                          {formatPrice(
                            tick.ask,
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-fog-300">
                          {formatPrice(
                            spread,
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-fog-100">
                          {formatPrice(
                            tick.mid ??
                              tick.last,
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-fog-400">
                          {formatNumber(
                            tick.bidQuantity,
                            0,
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-fog-400">
                          {formatNumber(
                            tick.askQuantity,
                            0,
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-fog-400">
                          {formatNumber(
                            tick.volume,
                            0,
                            {
                              compact: true,
                            },
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[9.5px] text-fog-500">
                          {formatTimestamp(
                            tick.timestamp,
                          )}
                        </td>

                        <td className="px-4 py-2.5">
                          <Badge
                            tone={
                              tick.source?.includes(
                                "SIMULATED",
                              )
                                ? "warn"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {tick.source ??
                              "API"}
                          </Badge>
                        </td>

                        <td className="px-4 py-2.5">
                          <StatusBadge
                            status={
                              tick.status ??
                              "UNKNOWN"
                            }
                            size="sm"
                          />
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
