import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./lib/env.js";
import authenticatePlugin from "./plugins/authenticate.js";
import { authRoutes } from "./routes/auth.js";
import { caseRoutes } from "./routes/cases.js";
import { contactRoutes } from "./routes/contacts.js";
import { documentRoutes } from "./routes/documents.js";
import { eventRoutes } from "./routes/events.js";
import { taskRoutes } from "./routes/tasks.js";
import { noteRoutes } from "./routes/notes.js";
import { realtimeRoutes } from "./routes/realtime.js";
import { intakeRoutes } from "./routes/intake.js";
import { intakeWebhookRoutes } from "./routes/intake-webhooks.js";
import { publicFormRoutes } from "./routes/public-form.js";

async function start() {
  await fs.mkdir(path.resolve(env.STORAGE_DIR), { recursive: true });

  const app = Fastify({
    logger: { level: process.env.NODE_ENV === "production" ? "info" : "debug" },
    bodyLimit: 1024 * 1024,
  });

  const corsOrigins = [
    ...env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    ...(env.PUBLIC_FORM_ALLOWED_ORIGINS
      ? env.PUBLIC_FORM_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
      : []),
  ].filter(Boolean);

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });
  await app.register(multipart, {
    limits: { fileSize: 200 * 1024 * 1024 },
  });
  await app.register(websocket);
  await app.register(authenticatePlugin);

  app.get("/health", async () => ({ ok: true, at: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(caseRoutes);
  await app.register(contactRoutes);
  await app.register(documentRoutes);
  await app.register(eventRoutes);
  await app.register(taskRoutes);
  await app.register(noteRoutes);
  await app.register(realtimeRoutes);
  await app.register(intakeRoutes);
  await app.register(intakeWebhookRoutes);
  await app.register(publicFormRoutes);

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`Claudio server listening on :${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
