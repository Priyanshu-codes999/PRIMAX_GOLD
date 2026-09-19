import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../services/api";

export type ResourceStatus = "idle" | "loading" | "success" | "error";

export interface ResourceState<T> {
  data: T | null;
  status: ResourceStatus;
  error: string | null;
  errorDetail: ApiError | null;
  loading: boolean;
  lastUpdated: number | null;
  refetch: () => void;
}

/**
 * Standard data-fetching hook used by every data-driven panel.
 * Guarantees consistent loading / loaded / empty / error handling.
 */
export function useResource<T>(
  fetcher: () => Promise<T>,
  options: {
    enabled?: boolean;
    intervalMs?: number | null;
    deps?: unknown[];
  } = {},
): ResourceState<T> {
  const { enabled = true, intervalMs = null, deps = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>(enabled ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<ApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async () => {
    if (!enabled) return;
    setStatus((prev) => (prev === "success" ? "success" : "loading"));
    try {
      const result = await fetcherRef.current();
      if (!mounted.current) return;
      setData(result);
      setError(null);
      setErrorDetail(null);
      setStatus("success");
      setLastUpdated(Date.now());
    } catch (err) {
      if (!mounted.current) return;
      const apiError = err instanceof ApiError ? err : null;
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setErrorDetail(apiError);
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    mounted.current = true;
    execute();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute]);

  useEffect(() => {
    if (!intervalMs || !enabled) return;
    const id = window.setInterval(execute, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, execute]);

  return {
    data,
    status,
    error,
    errorDetail,
    loading: status === "loading",
    lastUpdated,
    refetch: execute,
  };
}
