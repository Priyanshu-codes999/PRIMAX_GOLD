import { create } from "zustand";
import type { DataMode } from "../types";

export type RefreshInterval = 2000 | 5000 | 10000 | 30000 | 60000;

export interface TerminalSettings {
  refreshIntervalMs: RefreshInterval;
  autoRefresh: boolean;
  showAnimations: boolean;
  compactTables: boolean;
  showChartGrid: boolean;
  timezone: "local" | "utc";
  notifications: {
    connectionChanges: boolean;
    orderUpdates: boolean;
    riskAlerts: boolean;
  };
}

interface AppState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  dataMode: DataMode;
  settings: TerminalSettings;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDataMode: (mode: DataMode) => void;
  updateSettings: (patch: Partial<TerminalSettings>) => void;
}

const initialSettings: TerminalSettings = {
  refreshIntervalMs: 10000,
  autoRefresh: true,
  showAnimations: true,
  compactTables: true,
  showChartGrid: true,
  timezone: "local",
  notifications: {
    connectionChanges: true,
    orderUpdates: true,
    riskAlerts: true,
  },
};

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  commandPaletteOpen: false,
  dataMode: "api",
  settings: initialSettings,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setDataMode: (mode) => set({ dataMode: mode }),
  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),
}));
