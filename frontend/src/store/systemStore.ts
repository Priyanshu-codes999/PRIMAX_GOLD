import { create } from "zustand";
import { getHealth } from "../services/backend";
import { marketSocket, type SocketState } from "../services/socket";
import type { ConnectionStatus, DataMode, HealthResponse } from "../types";

export interface SystemState {
  apiStatus: ConnectionStatus;
  apiLatencyMs: number | null;
  apiError: string | null;
  apiBaseUrl: string;
  wsUrl: string;
  lastCheckedAt: number | null;
  checking: boolean;
  health: HealthResponse | null;
  socket: SocketState;
  dataMode: DataMode;
  socketStarted: boolean;

  checkHealth: () => Promise<boolean>;
  startSocket: () => void;
  stopSocket: () => void;
  setDataMode: (mode: DataMode) => void;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  apiStatus: "connecting",
  apiLatencyMs: null,
  apiError: null,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  wsUrl: import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws",
  lastCheckedAt: null,
  checking: false,
  health: null,
  socket: {
    status: "disconnected",
    lastMessage: null,
    lastMessageAt: null,
    attempts: 0,
    error: null,
  },
  dataMode: "api",
  socketStarted: false,

  checkHealth: async () => {
    if (get().checking) return get().apiStatus === "connected";
    set({ checking: true });
    try {
      const result = await getHealth();
      set({
        apiStatus: "connected",
        apiLatencyMs: result.durationMs,
        apiError: null,
        health: result.data,
        lastCheckedAt: Date.now(),
        checking: false,
        dataMode: "api",
      });
      return true;
    } catch (error) {
      set({
        apiStatus: "disconnected",
        apiLatencyMs: null,
        apiError: error instanceof Error ? error.message : "API unreachable",
        health: null,
        lastCheckedAt: Date.now(),
        checking: false,
        dataMode: "preview",
      });
      return false;
    }
  },

  startSocket: () => {
    if (get().socketStarted) return;
    set({ socketStarted: true });
    marketSocket.subscribe((socket) => set({ socket }));
    marketSocket.connect();
  },

  stopSocket: () => {
    marketSocket.disconnect();
    set({ socketStarted: false });
  },

  setDataMode: (mode) => set({ dataMode: mode }),
}));
