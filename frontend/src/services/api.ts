/**
 * Centralized HTTP layer for the PRIMAX GOLD FastAPI backend.
 *
 * Environment variables:
 *   VITE_API_BASE_URL
 *   VITE_API_KEY
 *   VITE_WS_URL
 *
 * API authentication:
 *   X-API-Key
 */

import type { ApiRequestResult } from "../types";

export const API_BASE_URL: string =
  (
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000/api"
  ).replace(/\/+$/, "");

export const API_KEY: string =
  import.meta.env.VITE_API_KEY || "";

export const WS_URL: string =
  import.meta.env.VITE_WS_URL ||
  "ws://localhost:8000/ws";

export const ENDPOINTS = {
  health: "/health",
  marketTicks: "/market-ticks",
  orders: "/orders",
  executions: "/executions",
  positions: "/positions",
  portfolio: "/portfolio",
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

export const REQUEST_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    status: number,
    endpoint: string,
    cause?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.cause = cause;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export function buildUrl(
  path: string,
  params?: Record<
    string,
    string | number | undefined
  >,
) {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
  );

  if (params) {
    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== ""
        ) {
          url.searchParams.set(
            key,
            String(value),
          );
        }
      },
    );
  }

  return url.toString();
}

/**
 * Perform an authenticated JSON request.
 *
 * The backend expects:
 *   X-API-Key: <API key>
 */
export async function request<T>(
  path: string,
  options: RequestInit & {
    params?: Record<
      string,
      string | number | undefined
    >;
    timeoutMs?: number;
  } = {},
): Promise<ApiRequestResult<T>> {

  const {
    params,
    timeoutMs = REQUEST_TIMEOUT_MS,
    ...init
  } = options;

  const url = buildUrl(path, params);

  const controller =
    new AbortController();

  const started =
    performance.now();

  const timeoutId =
    window.setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

  try {

    const response = await fetch(url, {
      ...init,

      signal: controller.signal,

      headers: {
        Accept: "application/json",

        ...(API_KEY
          ? {
              "X-API-Key": API_KEY,
            }
          : {}),

        ...(init.headers || {}),
      },
    });

    const durationMs =
      Math.round(
        performance.now() - started,
      );

    if (!response.ok) {

      let detail =
        `Request failed with status ${response.status}`;

      try {

        const body =
          (await response.json()) as Record<
            string,
            unknown
          >;

        if (
          typeof body?.detail ===
          "string"
        ) {
          detail = body.detail;
        } else if (
          typeof body?.message ===
          "string"
        ) {
          detail = body.message;
        }

      } catch {
        // Response body was not JSON.
      }

      throw new ApiError(
        detail,
        response.status,
        url,
      );
    }

    const text =
      await response.text();

    let data: T;

    if (!text) {

      data = undefined as T;

    } else {

      try {

        data =
          JSON.parse(text) as T;

      } catch {

        throw new ApiError(
          "Response was not valid JSON",
          response.status,
          url,
        );
      }
    }

    return {
      data,
      ok: true,
      status: response.status,
      durationMs,
      fetchedAt: Date.now(),
    };

  } catch (error) {

    if (error instanceof ApiError) {
      throw error;
    }

    const aborted =
      error instanceof DOMException &&
      error.name === "AbortError";

    throw new ApiError(
      aborted
        ? `Request timed out after ${Math.round(
            timeoutMs / 1000,
          )}s`
        : "Unable to reach the PRIMAX GOLD API",
      0,
      url,
      error,
    );

  } finally {

    window.clearTimeout(timeoutId);
  }
}

/**
 * Backend payloads may be:
 *
 *   []
 *
 * or:
 *
 *   { data: [] }
 *   { items: [] }
 *   { results: [] }
 *   etc.
 */
export function extractList<T>(
  payload: unknown,
): T[] {

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {

    const record =
      payload as Record<
        string,
        unknown
      >;

    for (
      const key of [
        "data",
        "items",
        "results",
        "records",
        "rows",
        "orders",
        "executions",
        "positions",
        "ticks",
        "services",
      ]
    ) {

      if (
        Array.isArray(record[key])
      ) {
        return record[key] as T[];
      }
    }
  }

  return [];
}

export function extractObject<
  T extends object,
>(
  payload: unknown,
): T | null {

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    return payload as T;
  }

  return null;
}

export const api = {
  baseUrl: API_BASE_URL,
  apiKey: API_KEY,
  wsUrl: WS_URL,
  request,
  extractList,
  extractObject,
};

export default api;