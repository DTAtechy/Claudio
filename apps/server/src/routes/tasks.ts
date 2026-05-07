import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";

const taskStatus = z.enum(["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"]);
const taskPriority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function taskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/cases/:caseId/tasks", async (request) => {
    const { caseId } = request.params as { caseId: string };
    return prisma.task.findMany({
      where: { caseId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: { assignee: { select: { id: true, name: true } } },
    });
  });

  app.get("/tasks/mine", async (request) => {
    return prisma.task.findMany({
      where: { assigneeId: request.user!.sub, status: { not: "DONE" } },
      orderBy: { dueAt: "asc" },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
      },
    });
  });

  app.post("/cases/:caseId/tasks", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const created = await prisma.task.create({
      data: {
        caseId,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "OPEN",
        priority: data.priority ?? "NORMAL",
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        assigneeId: data.assigneeId ?? null,
      },
      include: { assignee: { select: { id: true, name: true } } },
    });
    broadcast({
      entity: "task",
      action: "created",
      caseId,
      id: created.id,
      data: created,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(201).send(created);
  });

  app.patch("/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const data = parsed.data;
    const completedAt =
      data.status === "DONE"
        ? new Date()
        : data.status !== undefined
          ? null
          : undefined;
    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueAt !== undefined && {
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
        }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(completedAt !== undefined && { completedAt }),
      },
      include: { assignee: { select: { id: true, name: true } } },
    });
    broadcast({
      entity: "task",
      action: "updated",
      caseId: updated.caseId,
      id: updated.id,
      data: updated,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return updated;
  });

  app.delete("/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    await prisma.task.delete({ where: { id } });
    broadcast({
      entity: "task",
      action: "deleted",
      caseId: existing.caseId,
      id,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(204).send();
  });
}
