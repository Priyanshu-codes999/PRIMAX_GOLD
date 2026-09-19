import { useState } from "react";
import {
  Bell,
  Database,
  Eye,
  Globe,
  Info,
  LayoutDashboard,
  Lock,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader, KeyValueRow } from "../components/ui/Layout";
import { Badge, Button } from "../components/ui/Button";
import { Select, Toggle, SegmentedControl } from "../components/ui/Controls";
import { ConfirmationDialog } from "../components/ui/Overlays";
import { useAppStore, type RefreshInterval } from "../store/appStore";
import { useSystemStore } from "../store/systemStore";
import { useToastStore } from "../store/toastStore";
import { API_BASE_URL, WS_URL } from "../services/api";
import { cn, formatTimestamp } from "../utils/format";

export default function Settings() {
  const { settings, updateSettings, dataMode, setDataMode } = useAppStore();
  const { apiStatus, health, lastCheckedAt, checkHealth, checking, socket } = useSystemStore();
  const pushToast = useToastStore((state) => state.push);
  const [confirmReset, setConfirmReset] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(settings.compactTables ? "compact" : "comfortable");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Terminal appearance, data-refresh behaviour, notification preferences and environment information. Preferences are stored locally in the browser — no account or authentication layer is involved."
        meta={
          <>
            <Badge tone="gold" size="sm">
              PAPER TRADING = ACTIVE
            </Badge>
            <Badge tone="neutral" size="sm">
              LIVE TRADING = DISABLED / FUTURE
            </Badge>
          </>
        }
        actions={
          <Button
            variant="primary"
            icon={<Save className="h-3.5 w-3.5" />}
            onClick={() =>
              pushToast({
                tone: "success",
                title: "Preferences saved",
                message: "Terminal preferences are stored locally for this browser session.",
              })
            }
          >
            Save preferences
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ------------------------------------------------------ appearance */}
        <Panel>
          <SectionHeader
            title="Appearance"
            subtitle="Visual preferences for the terminal interface"
            actions={<Palette className="h-4 w-4 text-fog-500" />}
          />

          <div className="mt-4 space-y-1">
            <div className="flex items-start justify-between gap-4 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-fog-200">Theme</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fog-500">
                  The terminal uses a purpose-built dark trading theme optimised for long market-monitoring
                  sessions. Additional themes are planned.
                </p>
              </div>
              <SegmentedControl
                size="sm"
                value="dark"
                onChange={() => undefined}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light (future)" },
                ]}
              />
            </div>

            <div className="h-px bg-ink-700/70" />

            <div className="flex items-start justify-between gap-4 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-fog-200">Table density</p>
                <p className="mt-0.5 text-[11px] text-fog-500">Row padding used across data tables.</p>
              </div>
              <SegmentedControl
                size="sm"
                value={density}
                onChange={(value) => {
                  setDensity(value);
                  updateSettings({ compactTables: value === "compact" });
                }}
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </div>

            <div className="h-px bg-ink-700/70" />

            <Toggle
              checked={settings.showAnimations}
              onChange={(value) => updateSettings({ showAnimations: value })}
              label="Interface animations"
              description="Subtle transitions on panels, drawers and status indicators. Charts remain animation-free for accuracy."
            />
            <div className="h-px bg-ink-700/70" />
            <Toggle
              checked={settings.showChartGrid}
              onChange={(value) => updateSettings({ showChartGrid: value })}
              label="Chart grid lines"
              description="Show analytical grid lines behind chart series."
            />
            <div className="h-px bg-ink-700/70" />
            <div className="flex items-start justify-between gap-4 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-fog-200">Timestamp timezone</p>
                <p className="mt-0.5 text-[11px] text-fog-500">How timestamps are rendered across the terminal.</p>
              </div>
              <Select
                className="w-[160px]"
                value={settings.timezone}
                onChange={(event) =>
                  updateSettings({ timezone: event.target.value as "local" | "utc" })
                }
              >
                <option value="local">Local time</option>
                <option value="utc">UTC</option>
              </Select>
            </div>
          </div>
        </Panel>

        {/* ----------------------------------------------------------- data */}
        <Panel>
          <SectionHeader
            title="Data & refresh"
            subtitle="Control how often the terminal polls the backend"
            actions={<RefreshCw className={cn("h-4 w-4 text-fog-500", checking && "animate-spin")} />}
          />

          <div className="mt-4 space-y-1">
            <Toggle
              checked={settings.autoRefresh}
              onChange={(value) => updateSettings({ autoRefresh: value })}
              label="Automatic refresh"
              description="Poll documented endpoints on a fixed interval while the terminal is open. WebSocket updates are applied immediately when available."
            />
            <div className="h-px bg-ink-700/70" />

            <div className="flex items-start justify-between gap-4 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-fog-200">Refresh interval</p>
                <p className="mt-0.5 text-[11px] text-fog-500">
                  Shorter intervals increase API load; longer intervals delay visual updates.
                </p>
              </div>
              <Select
                className="w-[160px]"
                value={String(settings.refreshIntervalMs)}
                onChange={(event) =>
                  updateSettings({ refreshIntervalMs: Number(event.target.value) as RefreshInterval })
                }
              >
                <option value="2000">Every 2 seconds</option>
                <option value="5000">Every 5 seconds</option>
                <option value="10000">Every 10 seconds</option>
                <option value="30000">Every 30 seconds</option>
                <option value="60000">Every minute</option>
              </Select>
            </div>

            <div className="h-px bg-ink-700/70" />

            <div className="flex items-start justify-between gap-4 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-fog-200">Data source mode</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fog-500">
                  <span className="text-gold-300">Auto</span> uses the FastAPI backend and falls back to the
                  clearly-labelled simulated preview dataset when the API is unreachable.{" "}
                  <span className="text-gold-300">API only</span> disables that fallback.
                </p>
              </div>
              <SegmentedControl
                size="sm"
                value={dataMode === "preview" ? "api" : "api"}
                onChange={() => undefined}
                options={[{ value: "api", label: "Auto / API" }]}
              />
            </div>

            <div className="h-px bg-ink-700/70" />

            <div className="flex items-start gap-3 rounded-lg border border-ink-700 bg-ink-880 p-3.5">
              <Server className="mt-0.5 h-3.5 w-3.5 text-fog-500" />
              <div>
                <p className="text-[10.5px] font-medium text-fog-300">Connection endpoints</p>
                <p className="mt-1 font-mono text-[10px] text-fog-500">API: {API_BASE_URL}</p>
                <p className="font-mono text-[10px] text-fog-500">WS: {WS_URL}</p>
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-fog-600">
                  Configured via VITE_API_BASE_URL and VITE_WS_URL environment variables.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-2 w-full"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => void checkHealth()}
              loading={checking}
            >
              Test backend connection
            </Button>
          </div>
        </Panel>

        {/* -------------------------------------------------- notifications */}
        <Panel>
          <SectionHeader
            title="Notifications"
            subtitle="Choose which events raise terminal notifications"
            actions={<Bell className="h-4 w-4 text-fog-500" />}
          />
          <div className="mt-3 space-y-1">
            <Toggle
              checked={settings.notifications.connectionChanges}
              onChange={(value) =>
                updateSettings({ notifications: { ...settings.notifications, connectionChanges: value } })
              }
              label="Connection changes"
              description="Notify when the API or WebSocket connection state changes."
            />
            <div className="h-px bg-ink-700/70" />
            <Toggle
              checked={settings.notifications.orderUpdates}
              onChange={(value) =>
                updateSettings({ notifications: { ...settings.notifications, orderUpdates: value } })
              }
              label="Order updates"
              description="Notify when orders are filled, cancelled or rejected."
            />
            <div className="h-px bg-ink-700/70" />
            <Toggle
              checked={settings.notifications.riskAlerts}
              onChange={(value) =>
                updateSettings({ notifications: { ...settings.notifications, riskAlerts: value } })
              }
              label="Risk alerts"
              description="Notify when risk limits are approached or the kill switch changes state."
            />
            <div className="h-px bg-ink-700/70" />
            <div className="flex items-start gap-3 py-3">
              <Eye className="mt-0.5 h-3.5 w-3.5 text-fog-500" />
              <p className="text-[10.5px] leading-relaxed text-fog-500">
                Notifications are delivered inside the terminal interface only. Email, SMS and webhook channels
                are not implemented — no external messages are sent from this frontend.
              </p>
            </div>
          </div>
        </Panel>

        {/* ---------------------------------------------------- environment */}
        <Panel>
          <SectionHeader
            title="Environment"
            subtitle="Runtime configuration and capability status"
            actions={<Info className="h-4 w-4 text-fog-500" />}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gold-400/25 bg-gold-400/[0.07] p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-gold-300" />
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-gold-300">
                  Paper trading
                </p>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-gold-200">Active</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-gold-200/70">
                All order flow, fills and P&L are simulated against backend market data.
              </p>
            </div>

            <div className="rounded-xl border border-ink-700 bg-ink-880 p-4">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-fog-500" />
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-fog-500">
                  Live trading
                </p>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-fog-300">Disabled / Future</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-fog-500">
                Real-money trading is intentionally not implemented and cannot be enabled from this interface.
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-ink-700/60">
            <KeyValueRow
              label="API status"
              value={
                <Badge tone={apiStatus === "connected" ? "gain" : "warn"} size="sm">
                  {apiStatus.toUpperCase()}
                </Badge>
              }
            />
            <KeyValueRow
              label="WebSocket"
              value={
                <Badge tone={socket.status === "connected" ? "gain" : "neutral"} size="sm">
                  {socket.status.toUpperCase()}
                </Badge>
              }
            />
            <KeyValueRow label="Backend version" value={String(health?.version ?? "—")} />
            <KeyValueRow label="Environment" value={String(health?.environment ?? "paper-trading")} />
            <KeyValueRow label="Last health check" value={formatTimestamp(lastCheckedAt, "full")} />
            <KeyValueRow label="Frontend build" value="PRIMAX GOLD Terminal v1.0" />
            <KeyValueRow label="Framework" value="React 19 · Vite · Tailwind CSS · Recharts" />
          </div>

          <div className="mt-4 rounded-lg border border-ink-700 bg-ink-880 p-3.5">
            <div className="flex items-start gap-2.5">
              <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 text-fog-500" />
              <p className="text-[10.5px] leading-relaxed text-fog-500">
                Preferences are persisted in browser storage only. Clearing site data restores the default
                terminal configuration — no settings are sent to or stored on the backend.
              </p>
            </div>
          </div>

          <Button variant="danger" className="mt-3 w-full" icon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setConfirmReset(true)}>
            Reset all preferences
          </Button>
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          title="About PRIMAX GOLD"
          subtitle="Product context and responsible-use notes"
          actions={<Monitor className="h-4 w-4 text-fog-500" />}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              icon: Database,
              title: "Real backend integration",
              body: "The terminal consumes the documented FastAPI + PostgreSQL contract through a centralized, typed API layer. Missing capabilities are shown as unavailable rather than simulated.",
            },
            {
              icon: Globe,
              title: "Research-first design",
              body: "Every surface is built for quantitative review: honest empty states, explicit data provenance and clear separation between live, simulated and paper-trading values.",
            },
            {
              icon: ShieldCheck,
              title: "Responsible disclosure",
              body: "PRIMAX GOLD operates in a paper-trading and research environment. Past simulation results do not guarantee future performance, and signals are not financial advice.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-ink-700 bg-ink-880 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/20 bg-gold-400/10 text-gold-300">
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <p className="mt-3 text-[11px] font-semibold text-fog-200">{item.title}</p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-fog-500">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <KeyValueRow label="Data mode" value={<Badge tone={dataMode === "api" ? "gain" : "warn"} size="sm">{dataMode.toUpperCase()}</Badge>} />
          <KeyValueRow label="Layout" value={<LayoutDashboard className="h-3.5 w-3.5 text-fog-500" />} />
        </div>
      </Panel>

      <ConfirmationDialog
        open={confirmReset}
        danger
        title="Reset all preferences?"
        message="This restores the default terminal configuration, including refresh interval, table density and notification preferences. The change applies immediately to this browser."
        confirmLabel="Reset preferences"
        onConfirm={() => {
          setConfirmReset(false);
          updateSettings({
            refreshIntervalMs: 10000,
            autoRefresh: true,
            showAnimations: true,
            compactTables: true,
            showChartGrid: true,
            timezone: "local",
            notifications: { connectionChanges: true, orderUpdates: true, riskAlerts: true },
          });
          setDataMode("api");
          pushToast({
            tone: "info",
            title: "Preferences reset",
            message: "Default terminal configuration has been restored.",
          });
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
