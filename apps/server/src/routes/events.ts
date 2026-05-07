import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";

const eventKind = z.enum([
  "DEADLINE",
  "STATUTE_OF_LIMITATIONS",
  "HEARING",
  "DEPOSITION",
  "MEDIATION",
  "TRIAL",
  "MEETING",
  "OTHER",
]);

const createSchema = z.object({
  kind: eventKind,
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  allDay: z.boolean().optional(),
  location: z.string().max(300).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function eventRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/cases/:caseId/events", async (request) => {
    const { caseId } = request.params as { caseId: string };
    return prisma.calendarEvent.findMany({
      where: { caseId },
      orderBy: { startsAt: "asc" },
    });
  });

  // Firm-wide upcoming events across cases.
  app.get("/events/upcoming", async (request) => {
    const q = request.query as { days?: string };
    const days = Math.min(Math.max(parseInt(q.days ?? "30", 10) || 30, 1), 365);
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return prisma.calendarEvent.findMany({
      where: { startsAt: { gte: new Date(), lte: until } },
      orderBy: { startsAt: "asc" },
      include: { case: { select: { id: true, caseNumber: true, title: true } } },
    });
  });

  app.post("/cases/:caseId/events", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const created = await prisma.calendarEvent.create({
      data: {
        caseId,
        kind: data.kind,
        title: data.title,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        allDay: data.allDay ?? false,
        location: data.location ?? null,
        notes: data.notes ?? null,
      },
    });
    broadcast({
      entity: "event",
      action: "created",
      caseId,
      id: created.id,
      data: created,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(201).send(created);
  });

  app.patch("/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const data = parsed.data;
    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(data.kind !== undefined && { kind: data.kind }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
        ...(data.endsAt !== undefined && {
          endsAt: data.endsAt ? new Date(data.endsAt) : null,
        }),
        ...(data.allDay !== undefined && { allDay: data.allDay }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    broadcast({
      entity: "event",
      action: "updated",
      caseId: updated.caseId,
      id: updated.id,
      data: updated,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return updated;
  });

  app.delete("/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    await prisma.calendarEvent.delete({ where: { id } });
    broadcast({
      entity: "event",
      action: "deleted",
      caseId: existing.caseId,
      id,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(204).send();
  });
}
