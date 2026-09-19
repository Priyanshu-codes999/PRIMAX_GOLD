import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ChevronLeft,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LineChart,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Layers,
  CandlestickChart,
  Zap,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../utils/format";
import { useAppStore } from "../../store/appStore";
import { useSystemStore } from "../../store/systemStore";
import { useSocket } from "../../hooks/useSocket";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Terminal",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/markets", label: "Markets", icon: CandlestickChart },
      { to: "/orders", label: "Orders", icon: ScrollText },
      { to: "/executions", label: "Executions", icon: Zap },
      { to: "/positions", label: "Positions", icon: Layers },
      { to: "/portfolio", label: "Portfolio", icon: Briefcase },
    ],
  },
  {
    title: "Research",
    items: [
      { to: "/strategy", label: "Strategy", icon: Gauge },
      { to: "/performance", label: "Performance", icon: LineChart },
      { to: "/backtests", label: "Backtests", icon: FlaskConical },
      { to: "/model", label: "Model Analytics", icon: BrainCircuit },
    ],
  },
  {
    title: "Control",
    items: [
      { to: "/risk", label: "Risk & Security", icon: ShieldCheck },
      { to: "/system", label: "System Health", icon: Activity },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        fill="#141821"
        stroke="#b98f3e"
        strokeOpacity="0.5"
      />

      <path
        d="M10 28V12h6.2l3.4 8.6 3.4-8.6H29v16h-4.6v-8.2l-3.6 8.2h-2.6l-3.6-8.2V28H10z"
        fill="#d9b863"
      />

      <rect
        x="10"
        y="31"
        width="20"
        height="2"
        rx="1"
        fill="#b98f3e"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileNavOpen,
    setMobileNavOpen,
  } = useAppStore();

  const apiStatus = useSystemStore((state) => state.apiStatus);
  const socket = useSocket();

  const systemOnline =
    apiStatus === "connected" && socket.status === "connected";

  return (
    <>
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-ink-700/80 bg-ink-880 transition-[width,transform] duration-200 ease-out",
          sidebarCollapsed ? "w-[72px]" : "w-[248px]",
          mobileNavOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-[60px] items-center border-b border-ink-700/80",
            sidebarCollapsed
              ? "justify-center px-2"
              : "gap-2.5 px-4",
          )}
        >
          <BrandMark />

          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-300">
                Primax Gold
              </p>

              <p className="truncate text-[9.5px] uppercase tracking-[0.22em] text-fog-500">
                Quantitative Terminal
              </p>
            </div>
          )}

          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="hidden h-7 w-7 items-center justify-center rounded-md text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-200 lg:flex"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => setMobileNavOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-fog-500 hover:bg-ink-800 lg:hidden"
            aria-label="Close navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              {!sidebarCollapsed && (
                <p className="px-2.5 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-fog-600">
                  {section.title}
                </p>
              )}

              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileNavOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center rounded-lg transition-colors duration-150",
                          sidebarCollapsed
                            ? "justify-center px-2 py-2.5"
                            : "gap-2.5 px-2.5 py-2",
                          isActive
                            ? "bg-gold-400/[0.11] text-gold-200"
                            : "text-fog-400 hover:bg-ink-800/80 hover:text-fog-200",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-4.5 w-[2.5px] -translate-y-1/2 rounded-r bg-gold-400" />
                          )}

                          <item.icon
                            className={cn(
                              "h-[15px] w-[15px] shrink-0",
                              isActive
                                ? "text-gold-300"
                                : "text-fog-500 group-hover:text-fog-300",
                            )}
                          />

                          {!sidebarCollapsed && (
                            <span className="truncate text-[12px] font-medium">
                              {item.label}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer status */}
        <div
          className={cn(
            "border-t border-ink-700/80 py-3",
            sidebarCollapsed ? "px-2" : "px-4",
          )}
        >
          <div
            className={cn(
              "flex items-center",
              sidebarCollapsed ? "justify-center" : "gap-2.5",
            )}
          >
            {/* Connection indicator */}
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                systemOnline
                  ? "bg-gain-400"
                  : apiStatus === "connected"
                    ? "bg-warn-400"
                    : "bg-loss-400",
              )}
            />

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-[9.5px] uppercase tracking-[0.16em] text-fog-500">
                  System
                </p>

                <p className="truncate text-[10px] text-fog-400">
                  {apiStatus === "connected"
                    ? socket.status === "connected"
                      ? "API + WebSocket online"
                      : "API online · WS offline"
                    : "Backend unreachable"}
                </p>
              </div>
            )}

            {!sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                className="ml-auto flex h-6 w-6 items-center justify-center rounded text-fog-600 hover:bg-ink-800 hover:text-fog-300 lg:hidden"
                aria-label="Expand sidebar"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="mt-2 flex w-full items-center justify-center rounded-md py-1.5 text-fog-600 hover:bg-ink-800 hover:text-fog-300"
              aria-label="Expand sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}