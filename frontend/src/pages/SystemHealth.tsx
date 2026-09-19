import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  KeyRound,
  Link2,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader, KeyValueRow } from "../components/ui/Layout";
import { Badge, Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Indicators";
import { ConnectionIndicator, StatusTile, type IndicatorStatus } from "../components/ui/Status";
import { ConfirmationDialog } from "../components/ui/Overlays";
import { TableSkeleton, UnavailableState } from "../components/ui/States";
import {
  getExecutions,
  getHealth,
  getMarketTicks,
  getOrders,
  getPortfolio,
  getPositions,
} from "../services/backend";
import { useSocket } from "../hooks/useSocket";
import { useSystemStore } from "../store/systemStore";
import { useToastStore } from "../store/toastStore";
import { API_BASE_URL, WS_URL } from "../services/api";
import { cn, formatDuration, formatLatency, formatTimestamp, timeAgo } from "../utils/format";

interface ProbeResult {
  name: string;
  path: string;
  status: IndicatorStatus;
  latencyMs: number | null;
  checkedAt: number | null;
  error?: string;
  detail: string;
}

const PROBES: Array<{ name: string; path: string; run: () => Promise<unknown>; detail: string }> = [
  {
    name: "Health service",
    path: "/health",
    run: getHealth,
    detail: "Service liveness, version and environment metadata",
  },
  {
    name: "Market data",
    path: "/market-ticks",
    run: getMarketTicks,
    detail: "Latest instrument quotes and depth quantities",
  },
  { name: "Order service", path: "/orders", run: getOrders, detail: "Order lifecycle records" },
  {
    name: "Execution service",
    path: "/executions",
    run: getExecutions,
    detail: "Fill records, fees and latency telemetry",
  },
  {
    name: "Position service",
    path: "/positions",
    run: getPositions,
    detail: "Open position state and mark-to-market pricing",
  },
  {
    name: "Portfolio service",
    path: "/portfolio",
    run: getPortfolio,
    detail: "Cash, equity, P&L and exposure aggregates",
  },
];

export default function SystemHealth() {
  const socket = useSocket();
  const { apiStatus, apiLatencyMs, apiError, apiBaseUrl, checkHealth, checking, health, lastCheckedAt } =
    useSystemStore();
  const pushToast = useToastStore((state) => state.push);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [probing, setProbing] = useState(false);
  const [confirmReconnect, setConfirmReconnect] = useState(false);

  const runProbes = useCallback(async () => {
    setProbing(true);
    const results = await Promise.all(
      PROBES.map(async (probe): Promise<ProbeResult> => {
        const started = performance.now();
        try {
          await probe.run();
          return {
            name: probe.name,
            path: probe.path,
            status: "connected",
            latencyMs: Math.round(performance.now() - started),
            checkedAt: Date.now(),
            detail: probe.detail,
          };
        } catch (error) {
          return {
            name: probe.name,
            path: probe.path,
            status: "disconnected",
            latencyMs: null,
            checkedAt: Date.now(),
            error: error instanceof Error ? error.message : "Request failed",
            detail: probe.detail,
          };
        }
      }),
    );
    setProbes(results);
    setProbing(false);
  }, []);

  useEffect(() => {
    void runProbes();
  }, [runProbes]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Infrastructure"
        title="System Health"
        description="Live diagnostics for the FastAPI backend, database, market-data feed, WebSocket channel and trading engine. Endpoint probes execute real requests against the configured API."
        meta={
          <>
            <Badge tone={apiStatus === "connected" ? "gain" : "warn"} size="sm">
              {apiStatus === "connected" ? "BACKEND REACHABLE" : "BACKEND UNREACHABLE"}
            </Badge>
            <Badge tone="neutral" size="sm">
              API {API_BASE_URL}
            </Badge>
            <Badge tone="neutral" size="sm">
              WS {WS_URL}
            </Badge>
          </>
        }
        actions={
          <Button
            icon={<RefreshCw className={cn("h-3.5 w-3.5", (checking || probing) && "animate-spin")} />}
            onClick={() => {
              void checkHealth();
              void runProbes();
            }}
            loading={checking || probing}
          >
            Run diagnostics
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatusTile
          title="API gateway"
          status={apiStatus === "connected" ? "connected" : apiStatus === "connecting" ? "connecting" : "disconnected"}
          latencyMs={apiLatencyMs}
          lastUpdate={lastCheckedAt}
          detail={apiStatus === "connected" ? apiBaseUrl : (apiError ?? "No response from /api/health")}
          icon={<Server className="h-4 w-4" />}
          onRefresh={() => void checkHealth()}
          refreshing={checking}
        />
        <StatusTile
          title="Database"
          status={
            health?.database?.status
              ? (String(health.database.status).toLowerCase().includes("ok") ? "connected" : "degraded")
              : apiStatus === "connected"
                ? "connected"
                : "unknown"
          }
          latencyMs={health?.database?.latencyMs ?? null}
          detail={
            health?.database?.status
              ? `Reported status: ${String(health.database.status)}`
              : "Database metrics are aggregated by the backend health endpoint"
          }
          icon={<Database className="h-4 w-4" />}
        />
        <StatusTile
          title="Market data feed"
          status={probes.find((probe) => probe.path === "/market-ticks")?.status ?? "unknown"}
          latencyMs={probes.find((probe) => probe.path === "/market-ticks")?.latencyMs ?? null}
          detail="GET /api/market-ticks response telemetry"
          icon={<Activity className="h-4 w-4" />}
          onRefresh={runProbes}
          refreshing={probing}
        />
        <StatusTile
          title="WebSocket"
          status={
            socket.status === "connected"
              ? "connected"
              : socket.status === "connecting"
                ? "connecting"
                : socket.status === "error"
                  ? "error"
                  : "disconnected"
          }
          detail={
            socket.status === "connected"
              ? "Realtime channel open"
              : `Channel ${socket.status}${socket.attempts > 0 ? ` · ${socket.attempts} reconnect attempts` : ""}`
          }
          icon={<Wifi className="h-4 w-4" />}
          onRefresh={socket.connect}
        />
        <StatusTile
          title="Trading engine"
          status={apiStatus === "connected" ? "connected" : "unknown"}
          latencyMs={health?.tradingEngine?.latencyMs ?? null}
          detail={
            health?.tradingEngine?.status
              ? `Engine status: ${String(health.tradingEngine.status)}`
              : "Engine state is reported through the health endpoint"
          }
          icon={<Zap className="h-4 w-4" />}
        />
        <StatusTile
          title="Security controls"
          status={apiStatus === "connected" ? "connected" : "unknown"}
          detail="Authentication, rate limiting and order validation are enforced server-side"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" padded={false}>
          <div className="border-b border-ink-700/70 px-4 py-3.5">
            <SectionHeader
              title="Endpoint probes"
              subtitle="Each row performs a real request against the documented FastAPI contract"
              actions={
                <Badge tone="neutral" size="sm">
                  {probes.filter((probe) => probe.status === "connected").length}/{PROBES.length} REACHABLE
                </Badge>
              }
            />
          </div>
          {probes.length === 0 ? (
            <TableSkeleton rows={6} columns={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-ink-880">
                    {["Service", "Endpoint", "Status", "Latency", "Last checked", "Detail"].map((header) => (
                      <th
                        key={header}
                        className="border-b border-ink-700 px-4 py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-fog-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {probes.map((probe) => (
                    <tr key={probe.path} className="border-b border-ink-800/80 hover:bg-ink-800/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {probe.status === "connected" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-gain-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-loss-400" />
                          )}
                          <span className="text-[11.5px] font-medium text-fog-200">{probe.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10.5px] text-fog-400">GET {probe.path}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={probe.status === "connected" ? "HEALTHY" : "DISCONNECTED"} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10.5px] text-fog-300">
                        {probe.latencyMs !== null ? formatLatency(probe.latencyMs, "ms") : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-fog-500">
                        {probe.checkedAt ? timeAgo(probe.checkedAt) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[10.5px] text-fog-500">{probe.error ?? probe.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader title="Connection summary" subtitle="Current transport-layer state" />
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-fog-500">API status</span>
                <ConnectionIndicator
                  status={apiStatus === "connected" ? "connected" : "disconnected"}
                  label={apiStatus}
                  latencyMs={apiLatencyMs}
                  compact
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-fog-500">WebSocket</span>
                <ConnectionIndicator
                  status={
                    socket.status === "connected"
                      ? "connected"
                      : socket.status === "connecting"
                        ? "connecting"
                        : "disconnected"
                  }
                  label={socket.status}
                  compact
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-fog-500">Reconnect attempts</span>
                <span className="font-mono text-[11px] text-fog-300">{socket.attempts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-fog-500">Last message</span>
                <span className="font-mono text-[11px] text-fog-300">
                  {socket.lastMessageAt ? timeAgo(socket.lastMessageAt) : "—"}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-ink-700 bg-ink-880 p-3">
              <div className="flex items-start gap-2.5">
                <Link2 className="mt-0.5 h-3.5 w-3.5 text-fog-500" />
                <p className="text-[10.5px] leading-relaxed text-fog-500">
                  Endpoint configuration is read from <span className="font-mono text-fog-300">VITE_API_BASE_URL</span>{" "}
                  and <span className="font-mono text-fog-300">VITE_WS_URL</span>. No credentials are stored in the
                  frontend or exposed in this interface.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-3 w-full"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => setConfirmReconnect(true)}
            >
              Force reconnect sequence
            </Button>
          </Panel>

          <Panel>
            <SectionHeader title="Health payload" subtitle="Metadata reported by GET /api/health" />
            {health ? (
              <div className="mt-2 divide-y divide-ink-700/60">
                <KeyValueRow label="Status" value={String(health.status ?? "—")} />
                <KeyValueRow label="Service" value={String(health.service ?? "—")} />
                <KeyValueRow label="Version" value={String(health.version ?? "—")} />
                <KeyValueRow label="Environment" value={String(health.environment ?? "—")} />
                <KeyValueRow
                  label="Uptime"
                  value={health.uptimeSeconds ? formatDuration(health.uptimeSeconds) : "—"}
                />
                <KeyValueRow label="Timestamp" value={formatTimestamp(health.timestamp ?? lastCheckedAt, "full")} />
              </div>
            ) : (
              <UnavailableState
                title="Health payload unavailable"
                message="The backend did not return health metadata. Start the FastAPI service and run diagnostics again."
              />
            )}
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionHeader
          title="Operational guidance"
          subtitle="How the terminal behaves when individual services degrade"
        />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Server,
              title: "API unreachable",
              body: "Panels fall back to a clearly-labelled simulated preview dataset and surface a reconnect banner. No data is presented as live while the backend is down.",
            },
            {
              icon: Wifi,
              title: "WebSocket offline",
              body: "The terminal continues with HTTP polling using the configured refresh interval and retries the socket with exponential backoff.",
            },
            {
              icon: AlertTriangle,
              title: "Partial responses",
              body: "Each panel loads independently, so a single failing endpoint never blocks the rest of the interface.",
            },
            {
              icon: Lock,
              title: "Security",
              body: "Secrets, API keys and password hashes are never rendered. Authentication remains entirely server-side.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-ink-700 bg-ink-880 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 bg-ink-800 text-fog-400">
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <p className="mt-3 text-[11px] font-semibold text-fog-200">{item.title}</p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-fog-500">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-gold-400/20 bg-gold-400/[0.05] px-3.5 py-3">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-gold-300" />
          <p className="text-[10.5px] leading-relaxed text-gold-200/85">
            <KeyRound className="mr-1.5 inline h-3 w-3" />
            Status reporting here reflects what the backend chooses to expose. It is an operational overview,
            not a security audit or a production-grade monitoring guarantee.
          </p>
        </div>
      </Panel>

      <ConfirmationDialog
        open={confirmReconnect}
        title="Force reconnect sequence?"
        message="The terminal will drop the current WebSocket connection and re-run all endpoint diagnostics. Refreshing connections can briefly interrupt streaming updates."
        confirmLabel="Run reconnect"
        onConfirm={() => {
          setConfirmReconnect(false);
          socket.disconnect();
          socket.connect();
          void checkHealth();
          void runProbes();
          pushToast({
            tone: "info",
            title: "Reconnect sequence started",
            message: "Diagnostics are re-running against the configured backend.",
          });
        }}
        onCancel={() => setConfirmReconnect(false)}
      />
    </div>
  );
}
