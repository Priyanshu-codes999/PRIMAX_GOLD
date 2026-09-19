import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  Bell,
  Clock3,
  Menu,
  PanelLeft,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";

import { cn, formatLatency, formatTimestamp, timeAgo } from "../../utils/format";
import { useNow } from "../../utils/hooks";
import { useAppStore } from "../../store/appStore";
import { useSystemStore } from "../../store/systemStore";
import { useToastStore } from "../../store/toastStore";
import { useSocket } from "../../hooks/useSocket";
import { ConnectionIndicator } from "../ui/Status";

interface PageInfo {
  title: string;
  section: string;
}

const PAGE_TITLES: Record<string, PageInfo> = {
  "/": {
    title: "Overview",
    section: "Terminal",
  },
  "/markets": {
    title: "Markets",
    section: "Terminal",
  },
  "/orders": {
    title: "Orders",
    section: "Terminal",
  },
  "/executions": {
    title: "Executions",
    section: "Terminal",
  },
  "/positions": {
    title: "Positions",
    section: "Terminal",
  },
  "/portfolio": {
    title: "Portfolio",
    section: "Terminal",
  },
  "/strategy": {
    title: "Strategy",
    section: "Research",
  },
  "/performance": {
    title: "Performance",
    section: "Research",
  },
  "/backtests": {
    title: "Backtests",
    section: "Research",
  },
  "/model": {
    title: "Model Analytics",
    section: "Research",
  },
  "/risk": {
    title: "Risk & Security",
    section: "Control",
  },
  "/system": {
    title: "System Health",
    section: "Control",
  },
  "/settings": {
    title: "Settings",
    section: "Workspace",
  },
};

function BrandWordmark() {
  return (
    <div className="hidden items-center gap-2.5 md:flex">
      <div className="flex h-7 w-7 items-center justify-center rounded-md border border-gold-400/30 bg-gold-400/[0.06]">
        <span className="text-[11px] font-bold tracking-tight text-gold-300">
          M
        </span>
      </div>

      <div className="leading-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">
          Primax Gold
        </p>

        <p className="mt-1 text-[7.5px] uppercase tracking-[0.18em] text-fog-600">
          Quantitative Trading
        </p>
      </div>
    </div>
  );
}

export function TopBar() {
  const location = useLocation();
  const now = useNow(1000);

  const {
    toggleSidebar,
    setMobileNavOpen,
    dataMode,
    settings,
  } = useAppStore();

  const {
    apiStatus,
    apiLatencyMs,
    apiError,
    apiBaseUrl,
    checkHealth,
    checking,
    lastCheckedAt,
  } = useSystemStore();

  const socket = useSocket();

  const toasts = useToastStore((state) => state.toasts);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  const page =
    PAGE_TITLES[location.pathname] ?? {
      title: "Terminal",
      section: "PRIMAX GOLD",
    };

  const apiConnected = apiStatus === "connected";
  const websocketConnected = socket.status === "connected";
  const systemHealthy = apiConnected && websocketConnected;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[60px] items-center",
        "border-b border-ink-700/80",
        "bg-ink-900/95 backdrop-blur-md",
        "px-3 sm:px-4",
        settings.timezone,
      )}
    >
      {/* Mobile menu */}
      <button
        onClick={() => setMobileNavOpen(true)}
        className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink-700 text-fog-300 transition-colors hover:bg-ink-800 hover:text-fog-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Desktop sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="mr-3 hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-fog-500 transition-colors hover:border-ink-700 hover:bg-ink-800 hover:text-fog-200 lg:flex"
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* Brand */}
      <BrandWordmark />

      {/* Divider */}
      <div className="mx-4 hidden h-5 w-px bg-ink-700 md:block" />

      {/* Current page */}
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-fog-100">
          {page.title}
        </p>

        <p className="mt-0.5 hidden text-[8px] uppercase tracking-[0.18em] text-fog-600 sm:block">
          {page.section}
        </p>
      </div>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">

        {/* System state */}
        <div
          className={cn(
            "hidden items-center gap-2 rounded-md border px-2.5 py-1.5 xl:flex",
            systemHealthy
              ? "border-gain-400/15 bg-gain-400/[0.035]"
              : apiConnected
                ? "border-warn-400/15 bg-warn-400/[0.035]"
                : "border-loss-400/15 bg-loss-400/[0.035]",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              systemHealthy
                ? "bg-gain-400"
                : apiConnected
                  ? "bg-warn-400"
                  : "bg-loss-400",
            )}
          />

          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-fog-400">
            {systemHealthy
              ? "System Online"
              : apiConnected
                ? "Partial"
                : "Offline"}
          </span>
        </div>

        {/* API / WebSocket / Market Data */}
        <div className="hidden items-center gap-1.5 lg:flex">
          <ConnectionIndicator
            status={
              apiStatus === "connected"
                ? "connected"
                : apiStatus === "disconnected"
                  ? "disconnected"
                  : "connecting"
            }
            label="API"
            latencyMs={apiLatencyMs}
            compact
          />

          <ConnectionIndicator
            status={
              websocketConnected
                ? "connected"
                : socket.status === "connecting"
                  ? "connecting"
                  : "disconnected"
            }
            label="WS"
            compact
          />

          <ConnectionIndicator
            status={dataMode === "api" ? "connected" : "degraded"}
            label="DATA"
            compact
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => checkHealth()}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-fog-500 transition-colors hover:border-ink-700 hover:bg-ink-800 hover:text-fog-200"
          aria-label="Refresh connection"
          title={checking ? "Checking connection…" : `API: ${apiBaseUrl}`}
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              checking && "animate-spin",
            )}
          />
        </button>

        {/* Settings */}
        <Link
          to="/settings"
          className="hidden h-8 w-8 items-center justify-center rounded-md border border-transparent text-fog-500 transition-colors hover:border-ink-700 hover:bg-ink-800 hover:text-fog-200 sm:flex"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>

        {/* Notifications */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() =>
              setNotificationsOpen((previous) => !previous)
            }
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-fog-500 transition-colors hover:border-ink-700 hover:bg-ink-800 hover:text-fog-200"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-3.5 w-3.5" />

            {(toasts.length > 0 || !apiConnected) && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold-400" />
            )}
          </button>

          {notificationsOpen && (
            <div className="panel absolute right-0 top-10 w-[320px] overflow-hidden fade-in">
              {/* Header */}
              <div className="border-b border-ink-700 px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fog-400">
                    System Notifications
                  </p>

                  <Activity className="h-3.5 w-3.5 text-fog-600" />
                </div>
              </div>

              {/* Notification body */}
              <div className="max-h-[320px] overflow-y-auto">
                {!apiConnected && (
                  <div className="border-b border-ink-800 px-3.5 py-3">
                    <p className="text-[11px] font-medium text-warn-400">
                      Backend unreachable
                    </p>

                    <p className="mt-1 text-[10.5px] leading-relaxed text-fog-500">
                      {apiError ??
                        "The FastAPI service did not respond to the last health check."}
                    </p>

                    <p className="mt-1.5 font-mono text-[9.5px] text-fog-600">
                      Last check{" "}
                      {lastCheckedAt
                        ? timeAgo(lastCheckedAt)
                        : "never"}
                    </p>
                  </div>
                )}

                {toasts.length === 0 && apiConnected ? (
                  <div className="px-3.5 py-7 text-center">
                    <p className="text-[11px] text-fog-500">
                      No new notifications
                    </p>
                  </div>
                ) : (
                  toasts.map((toast) => (
                    <div
                      key={toast.id}
                      className="border-b border-ink-800 px-3.5 py-2.5 last:border-0"
                    >
                      <p className="text-[11px] font-medium text-fog-200">
                        {toast.title}
                      </p>

                      {toast.message ? (
                        <p className="mt-1 text-[10.5px] leading-relaxed text-fog-500">
                          {toast.message}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}

                {/* Connection details */}
                <div className="border-t border-ink-800 px-3.5 py-2.5">
                  <p className="text-[10px] text-fog-600">
                    WebSocket:{" "}
                    {websocketConnected
                      ? "channel open"
                      : "not connected"}

                    {apiLatencyMs !== null
                      ? ` · API ${formatLatency(
                          apiLatencyMs,
                          "ms",
                        )}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clock */}
        <div className="hidden items-center gap-2 rounded-md border border-ink-700/80 bg-ink-880/60 px-2.5 py-1.5 md:flex">
          <Clock3 className="h-3 w-3 text-fog-600" />

          <div className="leading-tight">
            <p className="font-mono text-[10.5px] text-fog-200">
              {formatTimestamp(now, "time")}
            </p>

            <p className="text-[8px] uppercase tracking-[0.14em] text-fog-600">
              {settings.timezone === "utc" ? "UTC" : "LOCAL"} ·{" "}
              {formatTimestamp(now, "date")}
            </p>
          </div>
        </div>

        {/* Search */}
        <button
          className="hidden h-8 items-center gap-2 rounded-md border border-ink-700/80 bg-ink-880/60 px-2.5 text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-300 lg:flex"
          aria-label="Search"
          title="Search"
        >
          <Search className="h-3 w-3" />

          <span className="text-[9.5px]">Search</span>

          <span className="ml-1 rounded border border-ink-700 px-1 py-0.5 font-mono text-[7px] text-fog-600">
            /
          </span>
        </button>
      </div>
    </header>
  );
}