import { useState } from "react";
import {
  AlertOctagon,
  Ban,
  Fingerprint,
  KeyRound,
  Lock,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader, KeyValueRow } from "../components/ui/Layout";
import { Badge, Button } from "../components/ui/Button";
import { MetricCard, StatusBadge } from "../components/ui/Indicators";
import { ConfirmationDialog } from "../components/ui/Overlays";
import { UnavailableState } from "../components/ui/States";
import { Toggle } from "../components/ui/Controls";
import { useSystemStore } from "../store/systemStore";
import { useToastStore } from "../store/toastStore";
import { API_BASE_URL } from "../services/api";
import { cn, formatTimestamp } from "../utils/format";

export default function RiskSecurity() {
  const { apiStatus, health, lastCheckedAt, checkHealth, checking } = useSystemStore();
  const pushToast = useToastStore((state) => state.push);
  const [killSwitch, setKillSwitch] = useState(false);
  const [confirmHalt, setConfirmHalt] = useState(false);
  const [confirmResume, setConfirmResume] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [strictValidation, setStrictValidation] = useState(true);
  const [blockOnBreach, setBlockOnBreach] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Controls"
        title="Risk & Security"
        description="Pre-trade risk controls, kill-switch management and security posture. Enforcement is performed by the backend — this interface exposes control state and confirmation flows only."
        meta={
          <>
            <Badge tone={killSwitch ? "loss" : "gain"} size="sm">
              {killSwitch ? "TRADING HALTED" : "TRADING ACTIVE"}
            </Badge>
            <Badge tone="gold" size="sm">
              PAPER TRADING ENVIRONMENT
            </Badge>
            <Badge tone="neutral" size="sm">
              NO SECRETS STORED IN FRONTEND
            </Badge>
          </>
        }
        actions={
          <Button
            icon={<RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />}
            onClick={() => void checkHealth()}
            loading={checking}
          >
            Refresh status
          </Button>
        }
      />

      {/* ------------------------------------------------------- kill switch */}
      <div
        className={cn(
          "rounded-xl border p-4 transition-colors",
          killSwitch ? "border-loss-500/35 bg-loss-500/[0.07]" : "border-gain-500/25 bg-gain-500/[0.05]",
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border",
                killSwitch
                  ? "border-loss-500/35 bg-loss-500/12 text-loss-400"
                  : "border-gain-500/30 bg-gain-500/12 text-gain-400",
              )}
            >
              {killSwitch ? <Ban className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fog-500">Kill switch</p>
              <h2 className={cn("mt-1 text-[19px] font-semibold", killSwitch ? "text-loss-400" : "text-gain-400")}>
                {killSwitch ? "TRADING HALTED" : "TRADING ACTIVE"}
              </h2>
              <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-fog-400">
                {killSwitch
                  ? "New order flow is suppressed in the interface. Resuming requires explicit confirmation."
                  : "Order flow is permitted within configured risk limits. The kill switch can halt activity immediately."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {killSwitch ? (
              <Button variant="primary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setConfirmResume(true)}>
                Resume trading
              </Button>
            ) : (
              <Button variant="danger" icon={<AlertOctagon className="h-3.5 w-3.5" />} onClick={() => setConfirmHalt(true)}>
                Halt trading
              </Button>
            )}
            <Button variant="outline" icon={<Scale className="h-3.5 w-3.5" />} onClick={() => setConfirmReset(true)}>
              Reset risk counters
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Maximum order quantity"
          value="Server-configured"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          subValue="Per-order quantity cap enforced pre-trade"
        />
        <MetricCard
          label="Maximum position"
          value="Server-configured"
          icon={<Scale className="h-4 w-4" />}
          subValue="Absolute position-size ceiling per instrument"
        />
        <MetricCard
          label="Maximum notional"
          value="Server-configured"
          icon={<Lock className="h-4 w-4" />}
          subValue="Gross notional exposure ceiling"
        />
        <MetricCard
          label="Order validation"
          value={strictValidation ? "Strict" : "Standard"}
          icon={<ShieldCheck className={cn("h-4 w-4", strictValidation ? "text-gain-400" : "text-fog-400")} />}
          subValue="Price, size and staleness checks"
        />
        <MetricCard
          label="Rate limiting"
          value="Enforced"
          icon={<RefreshCw className="h-4 w-4" />}
          subValue="Request throttling applied by the API gateway"
        />
        <MetricCard
          label="API authentication"
          value={apiStatus === "connected" ? "Active" : "Unavailable"}
          icon={<Fingerprint className="h-4 w-4" />}
          tone={apiStatus === "connected" ? "gain" : "loss"}
          subValue="Token validation handled server-side"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionHeader
            title="Risk manager configuration"
            subtitle="Control surface for pre-trade limits"
            actions={<StatusBadge status={killSwitch ? "HALTED" : "ACTIVE"} size="sm" />}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              {
                title: "Order quantity limit",
                description:
                  "Caps the maximum quantity accepted on a single order. The authoritative value lives in the backend risk service and is not exposed through the current API contract.",
                icon: SlidersHorizontal,
              },
              {
                title: "Position limit",
                description:
                  "Prevents any single instrument from exceeding the configured absolute position size after the order would execute.",
                icon: Scale,
              },
              {
                title: "Notional limit",
                description:
                  "Restricts gross notional exposure across the book, protecting against concentrated directional risk.",
                icon: Lock,
              },
              {
                title: "Velocity & staleness checks",
                description:
                  "Rejects orders based on submission frequency and market-data staleness to avoid acting on outdated prices.",
                icon: RefreshCw,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-ink-700 bg-ink-880 p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 bg-ink-800 text-gold-300">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[11.5px] font-semibold text-fog-200">{item.title}</p>
                </div>
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-fog-500">{item.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone="neutral" size="sm">
                    VALUE: SERVER-SIDE
                  </Badge>
                  <Badge tone="gain" size="sm">
                    ENFORCED
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-ink-700 bg-ink-880 px-4 py-2">
            <Toggle
              checked={strictValidation}
              onChange={setStrictValidation}
              label="Strict pre-trade validation"
              description="Applies additional price-band and staleness checks before any order is accepted by the paper exchange."
            />
            <div className="h-px bg-ink-700/70" />
            <Toggle
              checked={blockOnBreach}
              onChange={setBlockOnBreach}
              label="Block orders on limit breach"
              description="When enabled, orders that would breach a configured limit are rejected instead of being partially accepted."
            />
          </div>

          <div className="mt-4">
            <UnavailableState
              title="Live risk metrics unavailable"
              message="The current FastAPI contract does not expose a dedicated risk-metrics endpoint (utilisation, limit consumption, breach history). The terminal will populate this section automatically once that endpoint exists — values are never invented here."
            />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader title="Security posture" subtitle="Principles applied across the terminal" />
            <div className="mt-3 space-y-2.5">
              {[
                {
                  icon: KeyRound,
                  title: "No credentials in the client",
                  body: "API keys, tokens and passwords are never embedded in source, environment-exposed bundles or the UI.",
                },
                {
                  icon: UserCheck,
                  title: "Server-side authentication",
                  body: "All authentication and authorisation decisions are made by the backend, not simulated in the browser.",
                },
                {
                  icon: ShieldCheck,
                  title: "Least-privilege endpoints",
                  body: "The frontend only calls the documented read endpoints; no undocumented write operations are attempted.",
                },
                {
                  icon: Lock,
                  title: "No sensitive rendering",
                  body: "Password hashes, secrets and internal identifiers are never rendered, logged or exported.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-2.5 rounded-lg border border-ink-700 bg-ink-880 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-700 bg-ink-800 text-fog-400">
                    <item.icon className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-medium text-fog-200">{item.title}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-fog-500">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHeader title="Environment" subtitle="Deployment and connectivity metadata" />
            <div className="mt-2 divide-y divide-ink-700/60">
              <KeyValueRow label="Trading mode" value={<Badge tone="gold" size="sm">PAPER TRADING</Badge>} />
              <KeyValueRow label="Live trading" value={<Badge tone="neutral" size="sm">DISABLED</Badge>} />
              <KeyValueRow label="API base URL" value={<span className="font-mono text-[10px]">{API_BASE_URL}</span>} />
              <KeyValueRow
                label="Backend status"
                value={<StatusBadge status={apiStatus === "connected" ? "HEALTHY" : "DISCONNECTED"} size="sm" />}
              />
              <KeyValueRow label="Health version" value={String(health?.version ?? "—")} />
              <KeyValueRow label="Environment" value={String(health?.environment ?? "paper-trading")} />
              <KeyValueRow label="Last check" value={formatTimestamp(lastCheckedAt, "full")} />
            </div>
          </Panel>

          <Panel>
            <SectionHeader title="Dangerous actions" subtitle="All destructive operations require confirmation" />
            <div className="mt-3 space-y-2">
              <Button variant="danger" className="w-full justify-start" icon={<AlertOctagon className="h-3.5 w-3.5" />} onClick={() => setConfirmHalt(true)}>
                Halt all trading activity
              </Button>
              <Button variant="outline" className="w-full justify-start" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setConfirmReset(true)}>
                Reset risk counters
              </Button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-fog-600">
              In this paper-trading build these controls manage interface state only. Backend enforcement is
              required before they can affect real order flow — which is intentionally not implemented.
            </p>
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionHeader
          title="Risk disclosure"
          subtitle="Important context for interpreting the controls shown on this page"
        />
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-gold-400/20 bg-gold-400/[0.05] p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
          <p className="text-[11px] leading-relaxed text-gold-200/85">
            PRIMAX GOLD currently operates in a paper-trading and research environment. The risk controls,
            limits and security indicators displayed here describe the interface and backend contract — they do
            not constitute a production-grade risk-management or security guarantee. Trading signals are
            experimental and should not be interpreted as financial advice.
          </p>
        </div>
      </Panel>

      {/* ------------------------------------------------------ confirmations */}
      <ConfirmationDialog
        open={confirmHalt}
        danger
        title="Halt all trading activity?"
        message={
          <>
            This will mark the kill switch as <span className="text-loss-400">TRADING HALTED</span> in the
            terminal and suppress new order actions until trading is resumed. In the paper-trading environment
            this affects interface state only — backend enforcement is required for live impact.
          </>
        }
        confirmLabel="Halt trading"
        onConfirm={() => {
          setConfirmHalt(false);
          setKillSwitch(true);
          pushToast({
            tone: "warning",
            title: "Kill switch engaged",
            message: "The terminal is now showing TRADING HALTED. Resume requires explicit confirmation.",
          });
        }}
        onCancel={() => setConfirmHalt(false)}
      />

      <ConfirmationDialog
        open={confirmResume}
        title="Resume trading activity?"
        message="Resuming re-enables order actions within the configured risk limits. Confirm that the conditions which triggered the halt have been resolved."
        confirmLabel="Resume trading"
        onConfirm={() => {
          setConfirmResume(false);
          setKillSwitch(false);
          pushToast({
            tone: "success",
            title: "Trading resumed",
            message: "Order actions are available again within configured risk limits.",
          });
        }}
        onCancel={() => setConfirmResume(false)}
      />

      <ConfirmationDialog
        open={confirmReset}
        danger
        title="Reset risk counters?"
        message="Resetting clears the interface's accumulated risk counters (utilisation, breach counts). This action is recorded in the local session and cannot be undone."
        confirmLabel="Reset counters"
        onConfirm={() => {
          setConfirmReset(false);
          pushToast({
            tone: "info",
            title: "Risk counters reset",
            message: "Local risk counters have been cleared for this session.",
          });
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
