import type { WebSocket } from "@fastify/websocket";
import type { RealtimeMessage } from "@claudio/shared";

// In-memory subscriber registry: caseId -> set of sockets.
// Single-process only; if we ever scale horizontally, swap to Redis pub/sub.
const subscribers = new Map<string, Set<WebSocket>>();

export function subscribe(caseId: string, socket: WebSocket): () => void {
  let set = subscribers.get(caseId);
  if (!set) {
    set = new Set();
    subscribers.set(caseId, set);
  }
  set.add(socket);
  return () => {
    const s = subscribers.get(caseId);
    if (!s) return;
    s.delete(socket);
    if (s.size === 0) subscribers.delete(caseId);
  };
}

export function broadcast(message: RealtimeMessage): void {
  const set = subscribers.get(message.caseId);
  if (!set) return;
  const payload = JSON.stringify(message);
  for (const socket of set) {
    try {
      socket.send(payload);
    } catch {
      // Best-effort; the close handler will remove dead sockets.
    }
  }
}
