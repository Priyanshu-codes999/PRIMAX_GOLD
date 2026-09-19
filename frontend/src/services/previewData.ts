/**
 * PREVIEW DATASET
 * ----------------
 * The PRIMAX GOLD frontend talks to a real FastAPI backend. When that backend
 * is unreachable (for example while viewing the UI before the API is running),
 * the terminal can render this clearly-labelled, deterministic SAMPLE dataset
 * so the interface remains reviewable.
 *
 * Nothing here is live market data, real order flow or a real trading result.
 * The UI marks every preview value with the "SIMULATED" badge.
 */

import type {
  EquityPoint,
  Execution,
  HealthResponse,
  MarketTick,
  Order,
  PortfolioResponse,
  Position,
} from "../types";
import { mulberry32 } from "../utils/format";

export const PREVIEW_NOTICE =
  "Simulated sample dataset — not live market data and not a real trading result.";

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD"] as const;

const BASE_PRICES: Record<string, number> = {
  XAUUSD: 2387.4,
  EURUSD: 1.0842,
  GBPUSD: 1.2718,
  USDJPY: 156.32,
  BTCUSD: 67420,
  ETHUSD: 3428.6,
};

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function previewTicks(): MarketTick[] {
  return SYMBOLS.map((symbol, index) => {
    const base = BASE_PRICES[symbol];
    const spread = base * 0.00012 + index * 0.00002;
    return {
      symbol,
      bid: Number((base - spread / 2).toFixed(5)),
      ask: Number((base + spread / 2).toFixed(5)),
      last: base,
      mid: base,
      bidQuantity: 1_200_000 - index * 95_000,
      askQuantity: 1_120_000 - index * 87_000,
      volume: 4_250_000 - index * 310_000,
      spread: Number(spread.toFixed(5)),
      timestamp: isoMinutesAgo(index),
      source: "SIMULATED FEED",
      status: "SIMULATED",
    };
  });
}

export function previewOrders(): Order[] {
  const rng = mulberry32(20260919);
  const statuses: Order["status"][] = [
    "FILLED",
    "FILLED",
    "FILLED",
    "CANCELLED",
    "REJECTED",
    "PENDING",
    "PARTIALLY_FILLED",
    "EXPIRED",
  ];
  return Array.from({ length: 42 }, (_, i) => {
    const symbol = SYMBOLS[i % SYMBOLS.length];
    const side = i % 2 === 0 ? "BUY" : "SELL";
    return {
      id: `SIM-ORD-${String(10240 + i)}`,
      symbol,
      side,
      type: i % 5 === 0 ? "MARKET" : "LIMIT",
      price: Number((BASE_PRICES[symbol] * (1 + (rng() - 0.5) * 0.004)).toFixed(5)),
      quantity: Math.round(50_000 + rng() * 950_000),
      filledQuantity: i % 4 === 3 ? 0 : Math.round(50_000 + rng() * 700_000),
      status: statuses[i % statuses.length],
      timestamp: isoMinutesAgo(i * 17 + 3),
      strategy: "logistic-imbalance-v1",
      latencyNs: Math.round(180_000 + rng() * 620_000),
      rejectReason: statuses[i % statuses.length] === "REJECTED" ? "Risk limit exceeded (simulated)" : null,
    };
  });
}

export function previewExecutions(): Execution[] {
  const rng = mulberry32(770211);
  return Array.from({ length: 64 }, (_, i) => {
    const symbol = SYMBOLS[i % SYMBOLS.length];
    return {
      id: `SIM-FILL-${String(50120 + i)}`,
      orderId: `SIM-ORD-${String(10240 + (i % 42))}`,
      symbol,
      side: i % 2 === 0 ? "BUY" : "SELL",
      price: Number((BASE_PRICES[symbol] * (1 + (rng() - 0.5) * 0.0035)).toFixed(5)),
      quantity: Math.round(25_000 + rng() * 480_000),
      fee: Number((1.2 + rng() * 26).toFixed(2)),
      latencyNs: Math.round(120_000 + rng() * 540_000),
      timestamp: isoMinutesAgo(i * 9 + 2),
      venue: "PAPER-EXCHANGE",
    };
  });
}

export function previewPositions(): Position[] {
  return [
    {
      symbol: "XAUUSD",
      quantity: 240_000,
      averageEntryPrice: 2374.15,
      marketPrice: 2387.4,
      unrealizedPnl: 3180.0,
      realizedPnl: 4210.4,
      positionValue: 572_976,
      side: "LONG",
      openedAt: isoMinutesAgo(312),
    },
    {
      symbol: "EURUSD",
      quantity: -180_000,
      averageEntryPrice: 1.0871,
      marketPrice: 1.0842,
      unrealizedPnl: 522.0,
      realizedPnl: -184.25,
      positionValue: 195_156,
      side: "SHORT",
      openedAt: isoMinutesAgo(174),
    },
    {
      symbol: "USDJPY",
      quantity: 95_000,
      averageEntryPrice: 155.88,
      marketPrice: 156.32,
      unrealizedPnl: 268.9,
      realizedPnl: 942.1,
      positionValue: 148_504,
      side: "LONG",
      openedAt: isoMinutesAgo(96),
    },
    {
      symbol: "BTCUSD",
      quantity: 0,
      averageEntryPrice: 66_980,
      marketPrice: 67_420,
      unrealizedPnl: 0,
      realizedPnl: 1284.6,
      positionValue: 0,
      side: "FLAT",
      openedAt: null,
    },
  ];
}

export function previewEquityCurve(): EquityPoint[] {
  const rng = mulberry32(424242);
  const points: EquityPoint[] = [];
  let equity = 250_000;
  let peak = equity;
  for (let i = 90; i >= 0; i -= 1) {
    const drift = (rng() - 0.42) * 1450;
    equity = Math.max(210_000, equity + drift);
    peak = Math.max(peak, equity);
    points.push({
      timestamp: isoMinutesAgo(i * 240),
      equity: Number(equity.toFixed(2)),
      pnl: Number((equity - 250_000).toFixed(2)),
      realizedPnl: Number(((equity - 250_000) * 0.68).toFixed(2)),
      unrealizedPnl: Number(((equity - 250_000) * 0.32).toFixed(2)),
      drawdown: Number((((equity - peak) / peak) * 100).toFixed(3)),
    });
  }
  return points;
}

export function previewPortfolio(): PortfolioResponse {
  return {
    cash: 128_640.55,
    initialCapital: 250_000,
    equity: 262_418.9,
    portfolioValue: 262_418.9,
    totalPnl: 12_418.9,
    realizedPnl: 8_421.35,
    unrealizedPnl: 3_997.55,
    fees: 1_284.4,
    exposure: 0.348,
    timestamp: new Date().toISOString(),
  };
}

export function previewHealth(): HealthResponse {
  return {
    status: "degraded",
    service: "primax-gold-terminal",
    version: "preview",
    environment: "paper-trading",
    uptimeSeconds: 86_400,
    timestamp: new Date().toISOString(),
  };
}
