import { ENDPOINTS, extractObject, extractList, request } from "./api";
import {
  normalizeExecution,
  normalizeHealth,
  normalizeOrder,
  normalizePortfolio,
  normalizePortfolioEntry,
  normalizePosition,
  normalizeTick,
} from "./normalize";
import type {
  ApiRequestResult,
  Execution,
  HealthResponse,
  MarketTick,
  Order,
  PortfolioResponse,
  Position,
} from "../types";

/* ------------------------------------------------------------------ health */

export async function getHealth(): Promise<ApiRequestResult<HealthResponse>> {
  const result = await request<unknown>(ENDPOINTS.health);
  return { ...result, data: normalizeHealth(result.data) };
}

/* ------------------------------------------------------------- market data */

export async function getMarketTicks(): Promise<ApiRequestResult<MarketTick[]>> {
  const result = await request<unknown>(ENDPOINTS.marketTicks);
  return {
    ...result,
    data: extractList<unknown>(result.data)
      .map(normalizeTick)
      .filter((tick): tick is MarketTick => tick !== null),
  };
}

/* ------------------------------------------------------------------ orders */

export async function getOrders(): Promise<ApiRequestResult<Order[]>> {
  const result = await request<unknown>(ENDPOINTS.orders);
  return {
    ...result,
    data: extractList<unknown>(result.data)
      .map(normalizeOrder)
      .filter((order): order is Order => order !== null),
  };
}

/* ------------------------------------------------------------- executions */

export async function getExecutions(): Promise<ApiRequestResult<Execution[]>> {
  const result = await request<unknown>(ENDPOINTS.executions);
  return {
    ...result,
    data: extractList<unknown>(result.data)
      .map(normalizeExecution)
      .filter((execution): execution is Execution => execution !== null),
  };
}

/* --------------------------------------------------------------- positions */

export async function getPositions(): Promise<ApiRequestResult<Position[]>> {
  const result = await request<unknown>(ENDPOINTS.positions);
  return {
    ...result,
    data: extractList<unknown>(result.data)
      .map(normalizePosition)
      .filter((position): position is Position => position !== null),
  };
}

/* --------------------------------------------------------------- portfolio */

export async function getPortfolio(): Promise<ApiRequestResult<PortfolioResponse>> {
  const result = await request<unknown>(ENDPOINTS.portfolio);
  return { ...result, data: normalizePortfolio(result.data) };
}

export const portfolioEntries = (payload: unknown) =>
  extractList<unknown>(payload)
    .map(normalizePortfolioEntry)
    .filter((entry) => entry !== null);

/* --------------------------------------------------------------- aggregate */

export interface BackendSnapshot {
  health: HealthResponse | null;
  ticks: MarketTick[];
  orders: Order[];
  executions: Execution[];
  positions: Position[];
  portfolio: PortfolioResponse | null;
}

/**
 * Loads the full documented backend contract in parallel.
 * Individual failures are captured rather than failing the whole snapshot,
 * so each panel can render its own error / empty state honestly.
 */
export async function loadBackendSnapshot(): Promise<{
  snapshot: BackendSnapshot;
  errors: Partial<Record<keyof BackendSnapshot, string>>;
}> {
  const [health, ticks, orders, executions, positions, portfolio] = await Promise.allSettled([
    getHealth(),
    getMarketTicks(),
    getOrders(),
    getExecutions(),
    getPositions(),
    getPortfolio(),
  ]);

  const errors: Partial<Record<keyof BackendSnapshot, string>> = {};
  const read = <T>(
    result: PromiseSettledResult<ApiRequestResult<T>>,
    key: keyof BackendSnapshot,
    fallback: T,
  ): T => {
    if (result.status === "fulfilled") return result.value.data;
    errors[key] = result.reason?.message ?? "Request failed";
    return fallback;
  };

  return {
    snapshot: {
      health: read(health, "health", null),
      ticks: read(ticks, "ticks", []),
      orders: read(orders, "orders", []),
      executions: read(executions, "executions", []),
      positions: read(positions, "positions", []),
      portfolio: read(portfolio, "portfolio", null),
    },
    errors,
  };
}

export const extractObjectSafe = extractObject;
