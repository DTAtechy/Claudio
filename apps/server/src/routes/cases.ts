import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";

const practiceArea = z.enum([
  "PERSONAL_INJURY",
  "MARITIME",
  "JONES_ACT",
  "LHWCA",
  "PRODUCT_LIABILITY",
  "PREMISES_LIABILITY",
  "AUTO",
  "OTHER",
]);

const status = z.enum([
  "INTAKE",
  "ACTIVE",
  "LITIGATION",
  "SETTLEMENT",
  "CLOSED",
  "ARCHIVED",
]);

const createSchema = z.object({
  caseNumber: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  status: status.optional(),
  practiceArea: practiceArea.optional(),
  description: z.string().max(5000).optional().nullable(),
  incidentDate: z.string().datetime().optional().nullable(),
  statuteOfLimitations: z.string().datetime().optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function caseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/cases", async (request) => {
    const q = (request.query as { q?: string; status?: string }) || {};
    const cases = await prisma.case.findMany({
      where: {
        ...(q.status ? { status: q.status as never } : {}),
        ...(q.q
          ? {
              OR: [
                { title: { contains: q.q, mode: "insensitive" } },
                { caseNumber: { contains: q.q, mode: "insensitive" } },
                { description: { contains: q.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
    });
    return cases;
  });

  app.get("/cases/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contacts: true,
            documents: true,
            events: true,
            tasks: true,
            notes: true,
          },
        },
      },
    });
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });

  app.post("/cases", async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const created = await prisma.case.create({
      data: {
        caseNumber: data.caseNumber,
        title: data.title,
        status: data.status ?? "INTAKE",
        practiceArea: data.practiceArea ?? "PERSONAL_INJURY",
        description: data.description ?? null,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : null,
        statuteOfLimitations: data.statuteOfLimitations
          ? new Date(data.statuteOfLimitations)
          : null,
      },
    });
    broadcast({
      entity: "case",
      action: "created",
      caseId: created.id,
      id: created.id,
      data: created,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(201).send(created);
  });

  app.patch("/cases/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const data = parsed.data;
    const updated = await prisma.case.update({
      where: { id },
      data: {
        ...(data.caseNumber !== undefined && { caseNumber: data.caseNumber }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.practiceArea !== undefined && { practiceArea: data.practiceArea }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.incidentDate !== undefined && {
          incidentDate: data.incidentDate ? new Date(data.incidentDate) : null,
        }),
        ...(data.statuteOfLimitations !== undefined && {
          statuteOfLimitations: data.statuteOfLimitations
            ? new Date(data.statuteOfLimitations)
            : null,
        }),
      },
    });
    broadcast({
      entity: "case",
      action: "updated",
      caseId: updated.id,
      id: updated.id,
      data: updated,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return updated;
  });

  app.delete("/cases/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (request.user!.role !== "ADMIN") {
      return reply.code(403).send({ error: "forbidden" });
    }
    await prisma.case.delete({ where: { id } });
    broadcast({
      entity: "case",
      action: "deleted",
      caseId: id,
      id,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(204).send();
  });
}
