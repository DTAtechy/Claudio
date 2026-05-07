import type { FastifyInstance } from "fastify";
import { verifyToken } from "../lib/auth.js";
import { subscribe } from "../lib/realtime.js";

// Clients connect to /ws?token=...&caseId=...
// They receive RealtimeMessage payloads scoped to that case.
export async function realtimeRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (connection, request) => {
    const query = request.query as { token?: string; caseId?: string };
    const token = query.token;
    const caseId = query.caseId;
    if (!token || !caseId) {
      connection.socket.close(1008, "missing token or caseId");
      return;
    }
    try {
      verifyToken(token);
    } catch {
      connection.socket.close(1008, "invalid token");
      return;
    }
    const unsubscribe = subscribe(caseId, connection.socket);
    connection.socket.on("close", unsubscribe);
    connection.socket.on("error", () => unsubscribe());
    connection.socket.send(
      JSON.stringify({ type: "ready", caseId, at: new Date().toISOString() }),
    );
  });
}
