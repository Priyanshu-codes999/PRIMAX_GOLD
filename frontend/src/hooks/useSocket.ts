import { useEffect, useState } from "react";
import { marketSocket, type SocketState } from "../services/socket";

/** Subscribes to the shared market WebSocket singleton. */
export function useSocket(): SocketState & {
  connect: () => void;
  disconnect: () => void;
} {
  const [state, setState] = useState<SocketState>(marketSocket.state);

  useEffect(() => {
    const unsubscribe = marketSocket.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    connect: () => marketSocket.connect(),
    disconnect: () => marketSocket.disconnect(),
  };
}
