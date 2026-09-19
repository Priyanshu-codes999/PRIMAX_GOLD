/**
 * WebSocket client for the FastAPI realtime channel (VITE_WS_URL).
 * Handles connection state, heartbeat, exponential-backoff reconnection and
 * graceful degradation when the socket is unavailable.
 */

import { WS_URL } from "./api";
import type { ConnectionStatus, WebSocketMessage } from "../types";

export type SocketStatus = Extract<
  ConnectionStatus,
  "connecting" | "connected" | "disconnected" | "error" | "unavailable"
>;

export interface SocketState {
  status: SocketStatus;
  lastMessage: WebSocketMessage | null;
  lastMessageAt: number | null;
  attempts: number;
  error: string | null;
}

type Listener = (state: SocketState) => void;

export class MarketSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manuallyClosed = false;

  readonly url = WS_URL;

  state: SocketState = {
    status: "disconnected",
    lastMessage: null,
    lastMessageAt: null,
    attempts: 0,
    error: null,
  };

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(partial: Partial<SocketState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.manuallyClosed = false;
    this.emit({ status: "connecting", error: null });

    try {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      socket.onopen = () => {
        this.emit({ status: "connected", attempts: 0, error: null });
        this.startHeartbeat();
      };

      socket.onmessage = (event) => {
        let parsed: WebSocketMessage | null = null;
        if (typeof event.data === "string") {
          try {
            parsed = JSON.parse(event.data) as WebSocketMessage;
          } catch {
            parsed = { type: "text", data: event.data };
          }
        }
        this.emit({
          lastMessage: parsed,
          lastMessageAt: Date.now(),
          status: "connected",
        });
      };

      socket.onerror = () => {
        this.emit({ status: "error", error: "WebSocket connection error" });
      };

      socket.onclose = () => {
        this.stopHeartbeat();
        this.socket = null;
        if (this.manuallyClosed) {
          this.emit({ status: "disconnected" });
          return;
        }
        this.emit({ status: "disconnected" });
        this.scheduleReconnect();
      };
    } catch (error) {
      this.emit({
        status: "unavailable",
        error: error instanceof Error ? error.message : "WebSocket unavailable",
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null) return;
    const attempts = this.state.attempts + 1;
    const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempts, 5));
    this.emit({ attempts });
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        } catch {
          /* heartbeat is best-effort */
        }
      }
    }, 25_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.emit({ status: "disconnected" });
  }

  send(payload: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
      return true;
    }
    return false;
  }
}

export const marketSocket = new MarketSocket();
