import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";

const createSchema = z.object({
  body: z.string().min(1).max(20_000),
});
const updateSchema = z.object({
  body: z.string().min(1).max(20_000),
});

export async function noteRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/cases/:caseId/notes", async (request) => {
    const { caseId } = request.params as { caseId: string };
    return prisma.note.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    });
  });

  app.post("/cases/:caseId/notes", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const created = await prisma.note.create({
      data: {
        caseId,
        authorId: request.user!.sub,
        body: parsed.data.body,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    broadcast({
      entity: "note",
      action: "created",
      caseId,
      id: created.id,
      data: created,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(201).send(created);
  });

  app.patch("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    if (existing.authorId !== request.user!.sub && request.user!.role !== "ADMIN") {
      return reply.code(403).send({ error: "forbidden" });
    }
    const updated = await prisma.note.update({
      where: { id },
      data: { body: parsed.data.body },
      include: { author: { select: { id: true, name: true } } },
    });
    broadcast({
      entity: "note",
      action: "updated",
      caseId: updated.caseId,
      id: updated.id,
      data: updated,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return updated;
  });

  app.delete("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    if (existing.authorId !== request.user!.sub && request.user!.role !== "ADMIN") {
      return reply.code(403).send({ error: "forbidden" });
    }
    await prisma.note.delete({ where: { id } });
    broadcast({
      entity: "note",
      action: "deleted",
      caseId: existing.caseId,
      id,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(204).send();
  });
}
