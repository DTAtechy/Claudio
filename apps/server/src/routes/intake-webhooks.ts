import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";
import { analyzeIntake } from "../lib/intakeAnalyzer.js";
import { env } from "../lib/env.js";

export async function intakeWebhookRoutes(app: FastifyInstance) {
  // Microsoft Graph subscription validation handshake
  app.get("/webhooks/outlook", async (request, reply) => {
    const { validationToken } = request.query as { validationToken?: string };
    if (!validationToken) return reply.code(400).send("missing validationToken");
    return reply
      .code(200)
      .header("Content-Type", "text/plain")
      .send(validationToken);
  });

  // Microsoft Graph change notification
  app.post("/webhooks/outlook", async (request, reply) => {
    // Validate clientState secret if configured
    if (env.OUTLOOK_WEBHOOK_SECRET) {
      const body = request.body as { value?: { clientState?: string }[] };
      const clientState = body?.value?.[0]?.clientState;
      if (clientState !== env.OUTLOOK_WEBHOOK_SECRET) {
        return reply.code(401).send({ error: "invalid_client_state" });
      }
    }

    const body = request.body as {
      value?: {
        resource?: string;
        resourceData?: {
          id?: string;
          "@odata.type"?: string;
        };
        changeType?: string;
      }[];
    };

    const notifications = body?.value ?? [];

    for (const notification of notifications) {
      // Only process new/created message notifications
      if (notification.changeType !== "created") continue;
      const msgId = notification.resourceData?.id;
      if (!msgId) continue;

      // Check for duplicate (idempotency)
      const existing = await prisma.intakeLead.findFirst({
        where: { externalId: msgId },
        select: { id: true },
      });
      if (existing) continue;

      // Create a placeholder lead — the actual email body would be fetched
      // via Graph API in a production integration; here we store the raw payload
      const lead = await prisma.intakeLead.create({
        data: {
          channel: "EMAIL",
          status: "NEW",
          body: `[Outlook message ${msgId} — fetch body via Graph API]`,
          rawData: notification as object,
          externalId: msgId,
          externalThreadId: notification.resource ?? null,
        },
      });

      broadcast({
        entity: "intake",
        action: "created",
        caseId: "intake",
        id: lead.id,
        actorId: "system",
        at: new Date().toISOString(),
      });

      analyzeIntake(lead.id).catch(() => {});
    }

    // Graph API requires a 202 response quickly
    return reply.code(202).send();
  });

  // Generic phone provider webhook (RingCentral / Dialpad / etc.)
  app.post("/webhooks/phone", async (request, reply) => {
    // HMAC-SHA256 validation if secret is configured
    if (env.PHONE_WEBHOOK_SECRET) {
      const signature = (request.headers["x-webhook-signature"] as string) ?? "";
      const rawBody = JSON.stringify(request.body);
      const expected = crypto
        .createHmac("sha256", env.PHONE_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return reply.code(401).send({ error: "invalid_signature" });
      }
    }

    const payload = request.body as {
      callId?: string;
      callerName?: string;
      from?: string;
      phone?: string;
      transcription?: string;
      recordingUrl?: string;
      duration?: number;
    };

    const phone = payload.from ?? payload.phone ?? null;
    const callId = payload.callId ?? null;

    if (callId) {
      const existing = await prisma.intakeLead.findFirst({
        where: { externalId: callId },
        select: { id: true },
      });
      if (existing) return reply.code(200).send({ ok: true });
    }

    const body =
      payload.transcription ??
      (phone ? `Incoming call from ${phone}` : "Incoming phone call");

    const lead = await prisma.intakeLead.create({
      data: {
        channel: "PHONE",
        status: "NEW",
        callerName: payload.callerName ?? null,
        phone,
        body,
        rawData: payload as object,
        externalId: callId,
      },
    });

    broadcast({
      entity: "intake",
      action: "created",
      caseId: "intake",
      id: lead.id,
      actorId: "system",
      at: new Date().toISOString(),
    });

    analyzeIntake(lead.id).catch(() => {});

    return { ok: true };
  });
}
