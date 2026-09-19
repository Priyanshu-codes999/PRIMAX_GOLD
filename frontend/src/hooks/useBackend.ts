import { useEffect, useMemo } from "react";
import { useResource, type ResourceState } from "./useResource";
import { useSystemStore } from "../store/systemStore";
import { useAppStore } from "../store/appStore";

export type DataSource = "api" | "preview";

export interface Sourced<T> {
  data: T;
  source: DataSource;
  apiError?: string;
}

/**
 * Data hook that always keeps the terminal renderable:
 *  1. tries the real FastAPI endpoint,
 *  2. falls back to the clearly-labelled simulated preview dataset
 *     when the backend is unreachable.
 *
 * The returned `source` is surfaced in the UI so simulated values are
 * never presented as live backend data.
 */
export function useSourcedResource<T>(
  apiFetcher: () => Promise<T>,
  previewProvider: () => T,
  options: { intervalMs?: number | null; deps?: unknown[] } = {},
): ResourceState<Sourced<T>> {
  return useResource<Sourced<T>>(
    async () => {
      try {
        const data = await apiFetcher();
        return { data, source: "api" };
      } catch (error) {
        return {
          data: previewProvider(),
          source: "preview",
          apiError: error instanceof Error ? error.message : "Backend unavailable",
        };
      }
    },
    { intervalMs: options.intervalMs ?? null, deps: options.deps ?? [] },
  );
}

/** Refresh interval configured in Settings → Data. */
export function useRefreshInterval(): number | null {
  const autoRefresh = useAppStore((state) => state.settings.autoRefresh);
  const interval = useAppStore((state) => state.settings.refreshIntervalMs);
  return autoRefresh ? interval : null;
}

/** Keeps the global connection state warm while the terminal is open. */
export function useSystemBootstrap() {
  const checkHealth = useSystemStore((state) => state.checkHealth);
  const startSocket = useSystemStore((state) => state.startSocket);
  const apiStatus = useSystemStore((state) => state.apiStatus);

  useEffect(() => {
    void checkHealth();
    startSocket();
  }, [checkHealth, startSocket]);

  useEffect(() => {
    const id = window.setInterval(() => void checkHealth(), 30_000);
    return () => window.clearInterval(id);
  }, [checkHealth]);

  return apiStatus;
}

/** Normalizes equity/history arrays into chart-ready series. */
export function useChartSeries<T extends { timestamp?: string | null }>(
  points: T[] | undefined | null,
  valueKey: keyof T,
): Array<{ label: string; value: number }> {
  return useMemo(() => {
    if (!Array.isArray(points)) return [];
    return points
      .map((point) => ({
        label: point.timestamp ?? "",
        value: Number((point[valueKey] as unknown) ?? 0),
      }))
      .filter((point) => Number.isFinite(point.value));
  }, [points, valueKey]);
}
