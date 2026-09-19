/**
 * Field coercion helpers.
 * The FastAPI backend may serialize values as numbers or numeric strings;
 * these helpers keep the UI consistent either way.
 */
import type {
  EquityPoint,
  Execution,
  HealthResponse,
  MarketTick,
  Order,
  OrderSide,
  OrderStatus,
  OrderType,
  PortfolioEntry,
  PortfolioResponse,
  Position,
} from "../types";
import { toNumber } from "../utils/format";

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value !== undefined && value !== null ? String(value) : fallback;
}

function num(value: unknown): number | null {
  return toNumber(value);
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  const n = toNumber(value);
  if (n !== null) return new Date(n > 1e12 ? n : n * 1000).toISOString();
  return null;
}

export function normalizeTick(input: unknown): MarketTick | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const symbol = str(pick(r, ["symbol", "instrument", "pair", "ticker"])).toUpperCase();
  if (!symbol) return null;
  const bid = num(pick(r, ["bid", "bid_price", "bidPrice"]));
  const ask = num(pick(r, ["ask", "ask_price", "askPrice"]));
  const last = num(pick(r, ["last", "last_price", "lastPrice", "price", "close"]));
  return {
    symbol,
    bid,
    ask,
    last,
    mid: num(pick(r, ["mid", "mid_price", "midPrice"])) ?? (bid !== null && ask !== null ? (bid + ask) / 2 : last),
    bidQuantity: num(pick(r, ["bid_quantity", "bidQuantity", "bid_size", "bidSize", "bidQty"])),
    askQuantity: num(pick(r, ["ask_quantity", "askQuantity", "ask_size", "askSize", "askQty"])),
    volume: num(pick(r, ["volume", "qty", "quantity", "turnover"])),
    spread:
      num(pick(r, ["spread", "spread_absolute"])) ??
      (bid !== null && ask !== null ? ask - bid : null),
    timestamp: iso(pick(r, ["timestamp", "ts", "time", "datetime", "updated_at", "updatedAt"])),
    source: str(pick(r, ["source", "feed", "venue", "origin"]), "") || null,
    status: str(pick(r, ["status", "state"]), "") || null,
  };
}

function normalizeSide(value: unknown): OrderSide {
  const v = str(value).toUpperCase();
  if (v.startsWith("B") || v === "LONG" || v === "BUY") return "BUY";
  if (v.startsWith("S") || v === "SHORT" || v === "SELL") return "SELL";
  return v === "BUY" ? "BUY" : "SELL";
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  const v = str(value).toUpperCase().replace(/\s+/g, "_");
  const allowed: OrderStatus[] = [
    "NEW",
    "PENDING",
    "SUBMITTED",
    "PARTIALLY_FILLED",
    "FILLED",
    "CANCELLED",
    "CANCELED",
    "REJECTED",
    "EXPIRED",
    "UNKNOWN",
  ];
  return (allowed.find((s) => v.includes(s)) ?? "UNKNOWN") as OrderStatus;
}

function normalizeOrderType(value: unknown): OrderType {
  const v = str(value).toUpperCase().replace(/\s+/g, "_");
  if (v.includes("STOP_LIMIT")) return "STOP_LIMIT";
  if (v.includes("STOP")) return "STOP";
  if (v.includes("LIMIT")) return "LIMIT";
  if (v.includes("MARKET")) return "MARKET";
  return "UNKNOWN";
}

export function normalizeOrder(input: unknown): Order | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  return {
    ...r,
    id: str(pick(r, ["id", "order_id", "orderId", "client_order_id", "clientOrderId"])),
    symbol: str(pick(r, ["symbol", "instrument", "ticker"])).toUpperCase(),
    side: normalizeSide(pick(r, ["side", "direction", "action"])),
    type: normalizeOrderType(pick(r, ["type", "order_type", "orderType"])),
    price: num(pick(r, ["price", "limit_price", "limitPrice"])),
    quantity: num(pick(r, ["quantity", "qty", "size", "amount"])) ?? 0,
    filledQuantity: num(pick(r, ["filled_quantity", "filledQuantity", "filled_qty", "executed_quantity", "executedQuantity"])),
    status: normalizeOrderStatus(pick(r, ["status", "state", "order_status"])),
    timestamp: iso(pick(r, ["timestamp", "created_at", "createdAt", "time", "datetime", "ts"])),
    createdAt: iso(pick(r, ["created_at", "createdAt"])),
    updatedAt: iso(pick(r, ["updated_at", "updatedAt", "modified_at"])),
    strategy: str(pick(r, ["strategy", "strategy_name", "source"]), "") || null,
    latencyNs: num(pick(r, ["latency_ns", "latencyNs", "latency", "latency_us"])),
    rejectReason: str(pick(r, ["reject_reason", "rejectReason", "reason", "detail"]), "") || null,
  };
}

export function normalizeExecution(input: unknown): Execution | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  return {
    ...r,
    id: str(pick(r, ["id", "execution_id", "executionId", "fill_id", "trade_id"])),
    orderId: str(pick(r, ["order_id", "orderId", "order"])),
    symbol: str(pick(r, ["symbol", "instrument", "ticker"])).toUpperCase(),
    side: normalizeSide(pick(r, ["side", "direction", "action"])),
    price: num(pick(r, ["price", "execution_price", "executionPrice", "fill_price", "fillPrice"])) ?? 0,
    quantity: num(pick(r, ["quantity", "qty", "size", "filled_quantity", "filledQuantity"])) ?? 0,
    fee: num(pick(r, ["fee", "fees", "commission", "fee_amount", "feeAmount"])),
    latencyNs: num(pick(r, ["latency_ns", "latencyNs"])),
    latencyMs: num(pick(r, ["latency_ms", "latencyMs", "latency"])),
    timestamp: iso(pick(r, ["timestamp", "executed_at", "executedAt", "created_at", "time", "ts"])),
    venue: str(pick(r, ["venue", "exchange", "destination"]), "") || null,
  };
}

export function normalizePosition(input: unknown): Position | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  return {
    ...r,
    symbol: str(pick(r, ["symbol", "instrument", "ticker"])).toUpperCase(),
    quantity: num(pick(r, ["quantity", "qty", "size", "position_size", "positionSize"])) ?? 0,
    averageEntryPrice: num(pick(r, ["average_entry_price", "averageEntryPrice", "avg_entry_price", "avgPrice", "entry_price", "entryPrice", "average_price"])),
    marketPrice: num(pick(r, ["market_price", "marketPrice", "last_price", "lastPrice", "current_price", "mark_price", "price"])),
    lastPrice: num(pick(r, ["last_price", "lastPrice", "market_price", "marketPrice"])),
    unrealizedPnl: num(pick(r, ["unrealized_pnl", "unrealizedPnl", "unrealised_pnl", "open_pnl"])),
    realizedPnl: num(pick(r, ["realized_pnl", "realizedPnl", "realised_pnl", "closed_pnl"])),
    positionValue: num(pick(r, ["position_value", "positionValue", "market_value", "marketValue", "notional"])),
    side: str(pick(r, ["side", "direction", "position_side"]), "") || null,
    openedAt: iso(pick(r, ["opened_at", "openedAt", "created_at", "timestamp"])),
  };
}

export function normalizePortfolio(payload: unknown): PortfolioResponse {
  const r = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  return {
    cash: num(pick(r, ["cash", "cash_balance", "cashBalance", "balance"])),
    initialCapital: num(pick(r, ["initial_capital", "initialCapital", "starting_capital", "startingCapital"])),
    equity: num(pick(r, ["equity", "account_equity", "accountEquity", "total_equity"])),
    portfolioValue: num(pick(r, ["portfolio_value", "portfolioValue", "total_value", "totalValue", "market_value"])),
    totalPnl: num(pick(r, ["total_pnl", "totalPnl", "total_profit", "pnl"])),
    realizedPnl: num(pick(r, ["realized_pnl", "realizedPnl", "realised_pnl"])),
    unrealizedPnl: num(pick(r, ["unrealized_pnl", "unrealizedPnl", "unrealised_pnl", "open_pnl"])),
    fees: num(pick(r, ["fees", "total_fees", "totalFees", "fees_paid", "commissions"])),
    exposure: num(pick(r, ["exposure", "gross_exposure", "grossExposure", "net_exposure"])),
    positions: undefined,
    holdings: undefined,
    history: undefined,
    equityCurve: undefined,
    timestamp: iso(pick(r, ["timestamp", "updated_at", "updatedAt", "as_of", "time"])),
  };
}

export function normalizeEquityPoint(input: unknown): EquityPoint | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  return {
    timestamp: iso(pick(r, ["timestamp", "time", "date", "datetime", "ts"])),
    equity: num(pick(r, ["equity", "value", "portfolio_value", "portfolioValue", "balance"])),
    pnl: num(pick(r, ["pnl", "profit", "total_pnl", "totalPnl"])),
    realizedPnl: num(pick(r, ["realized_pnl", "realizedPnl"])),
    unrealizedPnl: num(pick(r, ["unrealized_pnl", "unrealizedPnl"])),
    drawdown: num(pick(r, ["drawdown", "drawdown_pct", "drawdownPct"])),
  };
}

export function normalizePortfolioEntry(input: unknown): PortfolioEntry | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  return {
    ...r,
    symbol: str(pick(r, ["symbol", "instrument", "ticker"])).toUpperCase(),
    quantity: num(pick(r, ["quantity", "qty", "size"])),
    marketPrice: num(pick(r, ["market_price", "marketPrice", "last_price", "price"])),
    positionValue: num(pick(r, ["position_value", "positionValue", "market_value", "marketValue", "notional"])),
    realizedPnl: num(pick(r, ["realized_pnl", "realizedPnl"])),
    unrealizedPnl: num(pick(r, ["unrealized_pnl", "unrealizedPnl"])),
    fees: num(pick(r, ["fees", "fee", "total_fees"])),
    totalPnl: num(pick(r, ["total_pnl", "totalPnl", "pnl"])),
  };
}

export function normalizeHealth(payload: unknown): HealthResponse {
  return (payload && typeof payload === "object" ? payload : {}) as HealthResponse;
}
