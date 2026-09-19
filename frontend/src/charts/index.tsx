/**
 * Shared Recharts configuration for PRIMAX GOLD analytics.
 * All charts use the same axis, grid and tooltip styling so the
 * terminal reads as one coherent analytical surface.
 */
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, CHART_AXIS, CHART_COLORS, type TooltipEntry } from "../components/ui/ChartCard";
import { formatCurrency, formatNumber, formatPrice, formatTimestamp, parseTimestamp } from "../utils/format";

export interface SeriesPoint {
  [key: string]: string | number | null | undefined;
}

const commonAxisProps = {
  stroke: CHART_AXIS.stroke,
  tick: CHART_AXIS.tick,
  tickLine: false,
  axisLine: { stroke: CHART_AXIS.stroke },
};

function timeLabel(value: unknown): string {
  const date = parseTimestamp(value);
  if (!date) return String(value ?? "");
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function timeLabelFull(value: unknown): string {
  return formatTimestamp(value, "datetime");
}

export function ChartContainer({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as never}
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------- Area chart */

export function EquityAreaChart({
  data,
  dataKey = "equity",
  height = 260,
  color = CHART_COLORS.gold,
  formatter,
  baseline,
  baselineLabel,
}: {
  data: SeriesPoint[];
  dataKey?: string;
  height?: number;
  color?: string;
  formatter?: (value: unknown) => string;
  baseline?: number;
  baselineLabel?: string;
}) {
  return (
    <ChartContainer height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          {...commonAxisProps}
          minTickGap={28}
          tickFormatter={(value: unknown) => timeLabel(value)}
        />
        <YAxis
          {...commonAxisProps}
          width={62}
          orientation="right"
          domain={["auto", "auto"]}
          tickFormatter={(value: unknown) =>
            formatter ? formatter(value) : formatNumber(value, 0, { compact: true })
          }
        />
        <Tooltip
          cursor={{ stroke: "rgba(207,169,92,0.35)", strokeWidth: 1 }}
          content={
            <ChartTooltip
              formatter={(value) => (formatter ? formatter(value) : formatCurrency(value, 2))}
              labelFormatter={(label) => timeLabelFull(label)}
            />
          }
        />
        {baseline !== undefined && (
          <ReferenceLine
            y={baseline}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="4 4"
            label={baselineLabel ? { value: baselineLabel, position: "insideTopLeft", fill: "#6c7885", fontSize: 9 } : undefined}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#gradient-${dataKey})`}
          dot={false}
          activeDot={{ r: 3.2, strokeWidth: 1.5, stroke: "#0b0d11", fill: color }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/* ------------------------------------------------------------ Line chart */

export function MultiLineChart({
  data,
  series,
  height = 260,
  formatter,
  showLegend = true,
  yWidth = 62,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; name: string; color: string; dashed?: boolean }>;
  height?: number;
  formatter?: (value: unknown) => string;
  showLegend?: boolean;
  yWidth?: number;
}) {
  return (
    <ChartContainer height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: showLegend ? 18 : 4 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          {...commonAxisProps}
          minTickGap={28}
          tickFormatter={(value: unknown) => timeLabel(value)}
        />
        <YAxis
          {...commonAxisProps}
          width={yWidth}
          orientation="right"
          tickFormatter={(value: unknown) =>
            formatter ? formatter(value) : formatNumber(value, 0, { compact: true })
          }
        />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
          content={
            <ChartTooltip
              formatter={(value) => (formatter ? formatter(value) : formatNumber(value, 2))}
              labelFormatter={(label) => timeLabelFull(label)}
            />
          }
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={22}
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 9.5, color: "#8d99a6", fontFamily: "Inter, sans-serif", paddingTop: 6 }}
          />
        )}
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.name}
            stroke={item.color}
            strokeWidth={1.7}
            strokeDasharray={item.dashed ? "5 4" : undefined}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 1.4, stroke: "#0b0d11", fill: item.color }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

/* ------------------------------------------------------------- Bar chart */

export function DistributionBarChart({
  data,
  height = 240,
  colorKey,
  positiveColor = CHART_COLORS.gain,
  negativeColor = CHART_COLORS.loss,
  formatter,
  colorMode = "sign",
  baseColor = CHART_COLORS.gold,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  colorKey?: string;
  positiveColor?: string;
  negativeColor?: string;
  baseColor?: string;
  formatter?: (value: unknown) => string;
  colorMode?: "sign" | "single";
}) {
  return (
    <ChartContainer height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="22%">
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...commonAxisProps} minTickGap={16} />
        <YAxis
          {...commonAxisProps}
          width={58}
          orientation="right"
          tickFormatter={(value: unknown) =>
            formatter ? formatter(value) : formatNumber(value, 0, { compact: true })
          }
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.045)" }}
          content={
            <ChartTooltip formatter={(value) => (formatter ? formatter(value) : formatNumber(value, 2))} />
          }
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.16)" />
        <Bar dataKey={colorKey ?? "value"} isAnimationActive={false} radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                colorMode === "single"
                  ? baseColor
                  : entry.value >= 0
                    ? positiveColor
                    : negativeColor
              }
              fillOpacity={0.82}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/* ------------------------------------------------------- Drawdown chart */

export function DrawdownChart({
  data,
  height = 220,
}: {
  data: Array<{ label: string; drawdown: number }>;
  height?: number;
}) {
  return (
    <ChartContainer height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="drawdown-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.loss} stopOpacity={0.32} />
            <stop offset="100%" stopColor={CHART_COLORS.loss} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="label"
          {...commonAxisProps}
          minTickGap={28}
          tickFormatter={(value: unknown) => timeLabel(value)}
        />
        <YAxis
          {...commonAxisProps}
          width={52}
          orientation="right"
          tickFormatter={(value: unknown) => `${Number(value).toFixed(1)}%`}
        />
        <Tooltip
          cursor={{ stroke: "rgba(248,113,113,0.3)" }}
          content={
            <ChartTooltip
              formatter={(value) => `${Number(value).toFixed(2)}%`}
              labelFormatter={(label) => timeLabelFull(label)}
            />
          }
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke={CHART_COLORS.loss}
          strokeWidth={1.5}
          fill="url(#drawdown-gradient)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/* ----------------------------------------------------------- Donut chart */

export function ExposureDonutChart({
  data,
  height = 240,
  centerLabel,
  centerValue,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative">
      <ChartContainer height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="#0b0d11"
            strokeWidth={1.5}
            isAnimationActive={false}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={[CHART_COLORS.gold, CHART_COLORS.info, CHART_COLORS.gain, CHART_COLORS.neutral, "#a78bfa", "#f5b544"][index % 6]}
                fillOpacity={0.82}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={(value) => formatCurrency(value, 2)} />} />
          <Legend
            verticalAlign="bottom"
            height={26}
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 9.5, color: "#8d99a6", fontFamily: "Inter, sans-serif" }}
          />
        </PieChart>
      </ChartContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[9px] uppercase tracking-[0.16em] text-fog-500">{centerLabel}</p>
          <p className="mt-0.5 font-mono text-[13px] text-fog-100">{centerValue}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Sparkline */

export function Sparkline({
  data,
  color = CHART_COLORS.gold,
  height = 42,
  dataKey = "value",
}: {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  dataKey?: string;
}) {
  if (!data.length) return null;
  return (
    <ChartContainer height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.24} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.4}
          fill={`url(#spark-${dataKey})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function priceFormatter(value: unknown) {
  return formatPrice(value);
}

export function currencyFormatter(value: unknown) {
  return formatCurrency(value, 2);
}

export type { TooltipEntry };
export { CHART_COLORS };
