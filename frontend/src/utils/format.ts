/** Number, timestamp and class-name helpers used across the terminal. */

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

const numberFormatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function toNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatNumber(
  value: unknown,
  decimals = 2,
  options: { compact?: boolean; fallback?: string } = {},
): string {
  const { compact = false, fallback = "—" } = options;
  const num = toNumber(value);
  if (num === null) return fallback;
  return compact
    ? compactFormatter.format(num)
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
}

export function formatInteger(value: unknown, fallback = "—"): string {
  const num = toNumber(value);
  if (num === null) return fallback;
  return numberFormatter.format(Math.round(num));
}

export function formatCompact(value: unknown, decimals = 2, fallback = "—") {
  return formatNumber(value, decimals, { compact: true, fallback });
}

/** Prices: adaptive precision — 2 decimals above 10, more below. */
export function formatPrice(value: unknown, fallback = "—"): string {
  const num = toNumber(value);
  if (num === null) return fallback;
  const abs = Math.abs(num);
  const decimals = abs === 0 ? 2 : abs >= 1000 ? 2 : abs >= 10 ? 2 : abs >= 1 ? 3 : 5;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCurrency(
  value: unknown,
  decimals = 2,
  options: { sign?: boolean; fallback?: string } = {},
): string {
  const { sign = false, fallback = "—" } = options;
  const num = toNumber(value);
  if (num === null) return fallback;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(num));
  const prefix = num < 0 ? "−" : sign ? "+" : "";
  return `${prefix}$${formatted}`;
}

export function formatPercent(
  value: unknown,
  decimals = 2,
  options: { alreadyDecimal?: boolean; fallback?: string } = {},
): string {
  const { alreadyDecimal = true, fallback = "—" } = options;
  const num = toNumber(value);
  if (num === null) return fallback;
  const pct = alreadyDecimal ? num * 100 : num;
  return `${pct.toFixed(decimals)}%`;
}

export function formatSignedPercent(value: unknown, decimals = 2) {
  const num = toNumber(value);
  if (num === null) return "—";
  return `${num >= 0 ? "+" : "−"}${Math.abs(num).toFixed(decimals)}%`;
}

/** Latency formatting that adapts between ns, µs and ms. */
export function formatLatency(
  value: unknown,
  unit: "ns" | "us" | "ms" | "s" = "ns",
  fallback = "—",
): string {
  const num = toNumber(value);
  if (num === null) return fallback;
  let ns = num;
  switch (unit) {
    case "us":
      ns = num * 1_000;
      break;
    case "ms":
      ns = num * 1_000_000;
      break;
    case "s":
      ns = num * 1_000_000_000;
      break;
    default:
      ns = num;
  }
  const abs = Math.abs(ns);
  if (abs >= 1_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  if (abs >= 1_000) return `${(ns / 1_000).toFixed(2)} µs`;
  return `${ns.toFixed(0)} ns`;
}

export function formatDuration(seconds: unknown, fallback = "—"): string {
  const num = toNumber(seconds);
  if (num === null) return fallback;
  const d = Math.floor(num / 86400);
  const h = Math.floor((num % 86400) / 3600);
  const m = Math.floor((num % 3600) / 60);
  const s = Math.floor(num % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function parseTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value)
      ? value
      : value.replace(" ", "T");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatTimestamp(
  value: unknown,
  style: "datetime" | "date" | "time" | "full" = "datetime",
): string {
  const date = parseTimestamp(value);
  if (!date) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  switch (style) {
    case "date":
      return `${y}-${mo}-${d}`;
    case "time":
      return `${hh}:${mm}:${ss}`;
    case "full":
      return `${y}-${mo}-${d} ${hh}:${mm}:${ss}.${String(date.getMilliseconds()).padStart(3, "0")}`;
    default:
      return `${y}-${mo}-${d} ${hh}:${mm}:${ss}`;
  }
}

export function timeAgo(value: unknown, now: number = Date.now()): string {
  const date = parseTimestamp(value);
  if (!date) return "—";
  const diff = Math.max(0, now - date.getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function sortBy<T>(
  items: T[],
  key: keyof T | ((item: T) => unknown),
  direction: "asc" | "desc" = "asc",
): T[] {
  const accessor = typeof key === "function" ? key : (item: T) => item[key];
  return [...items].sort((a, b) => {
    const av = accessor(a) as never;
    const bv = accessor(b) as never;
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (typeof av === "number" && typeof bv === "number") {
      return direction === "asc" ? av - bv : bv - av;
    }
    return direction === "asc"
      ? String(av).localeCompare(String(bv), undefined, { numeric: true })
      : String(bv).localeCompare(String(av), undefined, { numeric: true });
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Deterministic PRNG so preview datasets are stable across renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
