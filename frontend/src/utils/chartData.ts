import type { EquityPoint } from "../types";

export interface ChartPoint {
  label: string;
  [key: string]: string | number;
}

export function equitySeries(points: EquityPoint[] | null | undefined): ChartPoint[] {
  if (!Array.isArray(points) || points.length === 0) return [];
  return points.map((point, index) => ({
    label: point.timestamp ?? point.time ?? point.date ?? String(index),
    equity: Number(point.equity ?? point.value ?? 0),
    pnl: Number(point.pnl ?? 0),
    realized: Number(point.realizedPnl ?? 0),
    unrealized: Number(point.unrealizedPnl ?? 0),
    drawdown: Number(point.drawdown ?? 0),
  }));
}

export function cumulativeSeries(values: number[]): ChartPoint[] {
  let running = 0;
  return values.map((value, index) => {
    running += value;
    return { label: String(index + 1), value: Number(running.toFixed(2)), raw: value };
  });
}

export function distributionSeries(values: number[], buckets = 12): Array<{ label: string; value: number }> {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / buckets || 1;
  return Array.from({ length: buckets }, (_, index) => {
    const lower = min + index * width;
    const upper = lower + width;
    const count = values.filter((value) =>
      index === buckets - 1 ? value >= lower && value <= upper : value >= lower && value < upper,
    ).length;
    return { label: `${(lower / 1000).toFixed(1)}k`, value: count };
  });
}
