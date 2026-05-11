import type { RealtimeMessage } from "@claudio/shared";
import { getToken } from "./api";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000/ws";

// Opens a WebSocket scoped to a single case. Caller passes a handler that
// receives RealtimeMessage envelopes; returns a close fn for cleanup.
export function openCaseSocket(
  caseId: string,
  onMessage: (msg: RealtimeMessage) => void,
): () => void {
  const token = getToken();
  if (!token) return () => {};
  const url = `${WS_URL}?token=${encodeURIComponent(token)}&caseId=${encodeURIComponent(caseId)}`;
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: number | null = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data && data.entity) onMessage(data as RealtimeMessage);
      } catch {
        // ignore non-JSON pings
      }
    };
    ws.onclose = () => {
      if (closed) return;
      reconnectTimer = window.setTimeout(connect, 2000);
    };
    ws.onerror = () => {
      ws?.close();
    };
  };
  connect();

  return () => {
    closed = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    ws?.close();
  };
}

// Subscribe to all intake-scoped realtime events (new leads, AI updates, etc.)
export function openIntakeSocket(onMessage: (msg: RealtimeMessage) => void): () => void {
  return openCaseSocket("intake", onMessage);
}
