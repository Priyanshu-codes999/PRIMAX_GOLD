/**
 * PRIMAX GOLD — domain types.
 * These interfaces model the FastAPI backend contracts
 * (GET /api/health, /market-ticks, /orders, /executions, /positions, /portfolio).
 * Fields are optional where backend payloads may legitimately omit them.
 */

export type DataMode = "api" | "preview";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "degraded"
  | "disconnected"
  | "unavailable"
  | "error";

export type ServiceHealthState =
  | "healthy"
  | "warning"
  | "disconnected"
  | "error"
  | "unknown";

export interface HealthService {
  name: string;
  status: ServiceHealthState;
  latencyMs?: number | null;
  lastUpdate?: string | null;
  detail?: string | null;
}

export interface HealthResponse {
  status?: string;
  service?: string;
  version?: string;
  environment?: string;
  uptimeSeconds?: number;
  timestamp?: string;
  latencyMs?: number | null;
  services?: HealthService[];
  database?: { status?: string; latencyMs?: number | null };
  marketData?: { status?: string; latencyMs?: number | null };
  websocket?: { status?: string; connections?: number | null };
  tradingEngine?: { status?: string; latencyMs?: number | null };
  [key: string]: unknown;
}

export interface MarketTick {
  symbol: string;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
  mid?: number | null;
  bidQuantity?: number | null;
  askQuantity?: number | null;
  volume?: number | null;
  spread?: number | null;
  timestamp?: string | null;
  source?: string | null;
  status?: string | null;
}

export type OrderSide = "BUY" | "SELL";
export type OrderStatus =
  | "NEW"
  | "PENDING"
  | "SUBMITTED"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "CANCELED"
  | "REJECTED"
  | "EXPIRED"
  | "UNKNOWN";

export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" | "UNKNOWN";

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number | null;
  quantity: number;
  filledQuantity?: number | null;
  status: OrderStatus;
  timestamp?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  strategy?: string | null;
  latencyNs?: number | null;
  rejectReason?: string | null;
  [key: string]: unknown;
}

export interface Execution {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee?: number | null;
  latencyNs?: number | null;
  latencyMs?: number | null;
  timestamp?: string | null;
  venue?: string | null;
  [key: string]: unknown;
}

export interface Position {
  symbol: string;
  quantity: number;
  averageEntryPrice?: number | null;
  marketPrice?: number | null;
  lastPrice?: number | null;
  unrealizedPnl?: number | null;
  realizedPnl?: number | null;
  positionValue?: number | null;
  side?: string | null;
  openedAt?: string | null;
  [key: string]: unknown;
}

export interface PortfolioEntry {
  symbol: string;
  quantity?: number | null;
  marketPrice?: number | null;
  positionValue?: number | null;
  realizedPnl?: number | null;
  unrealizedPnl?: number | null;
  fees?: number | null;
  totalPnl?: number | null;
  [key: string]: unknown;
}

export interface PortfolioResponse {
  cash?: number | null;
  initialCapital?: number | null;
  equity?: number | null;
  portfolioValue?: number | null;
  totalPnl?: number | null;
  realizedPnl?: number | null;
  unrealizedPnl?: number | null;
  fees?: number | null;
  exposure?: number | null;
  positions?: PortfolioEntry[] | null;
  holdings?: PortfolioEntry[] | null;
  history?: EquityPoint[] | null;
  equityCurve?: EquityPoint[] | null;
  timestamp?: string | null;
  [key: string]: unknown;
}

export interface EquityPoint {
  timestamp?: string | null;
  time?: string | null;
  date?: string | null;
  equity?: number | null;
  value?: number | null;
  pnl?: number | null;
  realizedPnl?: number | null;
  unrealizedPnl?: number | null;
  drawdown?: number | null;
  [key: string]: unknown;
}

export interface WebSocketMessage {
  type?: string;
  channel?: string;
  topic?: string;
  event?: string;
  data?: unknown;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ApiRequestResult<T> {
  data: T;
  ok: boolean;
  status: number;
  durationMs: number;
  fetchedAt: number;
}
