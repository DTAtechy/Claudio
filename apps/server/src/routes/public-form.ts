import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";
import { analyzeIntake } from "../lib/intakeAnalyzer.js";

const submitSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  hearAboutUs: z.string().max(100).optional(),
  description: z.string().min(1).max(5000),
});

export async function publicFormRoutes(app: FastifyInstance) {
  app.post("/intake/submit", async (request, reply) => {
    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const data = parsed.data;

    const body = [
      data.hearAboutUs ? `How they heard about us: ${data.hearAboutUs}` : null,
      data.description,
    ]
      .filter(Boolean)
      .join("\n\n");

    const lead = await prisma.intakeLead.create({
      data: {
        channel: "WEB_FORM",
        status: "NEW",
        callerName: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        subject: `Web form inquiry from ${data.name}`,
        body,
        source: (request.headers["origin"] as string) ?? "website",
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

    return reply.code(200).send({ ok: true });
  });
}
