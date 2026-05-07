import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";

const contactType = z.enum([
  "CLIENT",
  "OPPOSING_PARTY",
  "OPPOSING_COUNSEL",
  "WITNESS",
  "EXPERT",
  "MEDICAL_PROVIDER",
  "INSURANCE_ADJUSTER",
  "COURT",
  "OTHER",
]);

const createSchema = z.object({
  type: contactType,
  name: z.string().min(1).max(200),
  organization: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("").transform(() => null)),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function contactRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/cases/:caseId/contacts", async (request) => {
    const { caseId } = request.params as { caseId: string };
    return prisma.contact.findMany({
      where: { caseId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  });

  app.post("/cases/:caseId/contacts", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const created = await prisma.contact.create({
      data: { caseId, ...parsed.data },
    });
    broadcast({
      entity: "contact",
      action: "created",
      caseId,
      id: created.id,
      data: created,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(201).send(created);
  });

  app.patch("/contacts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const updated = await prisma.contact.update({
      where: { id },
      data: parsed.data,
    });
    broadcast({
      entity: "contact",
      action: "updated",
      caseId: updated.caseId,
      id: updated.id,
      data: updated,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return updated;
  });

  app.delete("/contacts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    await prisma.contact.delete({ where: { id } });
    broadcast({
      entity: "contact",
      action: "deleted",
      caseId: existing.caseId,
      id,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(204).send();
  });
}
