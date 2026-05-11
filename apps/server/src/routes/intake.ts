import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";
import { analyzeIntake } from "../lib/intakeAnalyzer.js";

const updateSchema = z.object({
  status: z
    .enum(["NEW", "ASSIGNED", "IN_PROGRESS", "CONVERTED", "CLOSED", "SPAM"])
    .optional(),
  assignedToId: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  callerName: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  subject: z.string().max(500).nullable().optional(),
});

function leadBroadcast(
  action: "created" | "updated" | "deleted",
  id: string,
  actorId: string,
  data?: object,
) {
  broadcast({
    entity: "intake",
    action,
    caseId: "intake",
    id,
    data,
    actorId,
    at: new Date().toISOString(),
  });
}

export async function intakeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // GET /intake/counts — sidebar badge
  app.get("/intake/counts", async (request) => {
    const count = await prisma.intakeLead.count({
      where: { status: "NEW" },
    });
    return { new: count };
  });

  // GET /intake — list with filters
  app.get("/intake", async (request) => {
    const q = (request.query as {
      status?: string;
      channel?: string;
      assigneeId?: string;
      q?: string;
    });

    const leads = await prisma.intakeLead.findMany({
      where: {
        ...(q.status ? { status: q.status as never } : {}),
        ...(q.channel ? { channel: q.channel as never } : {}),
        ...(q.assigneeId === "me"
          ? { assignedToId: request.user!.sub }
          : q.assigneeId
            ? { assignedToId: q.assigneeId }
            : {}),
        ...(q.q
          ? {
              OR: [
                { callerName: { contains: q.q, mode: "insensitive" } },
                { email: { contains: q.q, mode: "insensitive" } },
                { subject: { contains: q.q, mode: "insensitive" } },
                { body: { contains: q.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return leads;
  });

  // GET /intake/:id — single lead with messages
  app.get("/intake/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await prisma.intakeLead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!lead) return reply.code(404).send({ error: "not_found" });
    return lead;
  });

  // PATCH /intake/:id — update status / assignee / priority
  app.patch("/intake/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const data = parsed.data;

    const updated = await prisma.intakeLead.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.callerName !== undefined && { callerName: data.callerName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.subject !== undefined && { subject: data.subject }),
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    leadBroadcast("updated", id, request.user!.sub, updated);
    return updated;
  });

  // POST /intake/:id/assign
  app.post("/intake/:id/assign", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { assigneeId } = (request.body as { assigneeId?: string }) ?? {};

    const updated = await prisma.intakeLead.update({
      where: { id },
      data: {
        assignedToId: assigneeId ?? request.user!.sub,
        status: "ASSIGNED",
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    leadBroadcast("updated", id, request.user!.sub, updated);
    return updated;
  });

  // POST /intake/:id/convert — create a Case from this lead
  app.post("/intake/:id/convert", async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await prisma.intakeLead.findUnique({ where: { id } });
    if (!lead) return reply.code(404).send({ error: "not_found" });
    if (lead.convertedToCaseId) {
      return reply.code(409).send({ error: "already_converted" });
    }

    const caseNumber = `INT-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const practiceArea = mapClassificationToPracticeArea(lead.aiClassification);

    const [newCase] = await prisma.$transaction([
      prisma.case.create({
        data: {
          caseNumber,
          title: lead.callerName
            ? `${lead.callerName} — Intake ${new Date().toLocaleDateString()}`
            : `Intake ${new Date().toLocaleDateString()}`,
          status: "INTAKE",
          practiceArea: practiceArea as never,
          description: lead.body.slice(0, 1000),
        },
      }),
      prisma.intakeLead.update({
        where: { id },
        data: { status: "CONVERTED" },
      }),
    ]);

    // Link lead → case now that case.id is known
    await prisma.intakeLead.update({
      where: { id },
      data: { convertedToCaseId: newCase.id },
    });

    broadcast({
      entity: "case",
      action: "created",
      caseId: newCase.id,
      id: newCase.id,
      data: newCase,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    leadBroadcast("updated", id, request.user!.sub);

    return reply.code(201).send(newCase);
  });

  // POST /intake/:id/reply — add a staff message
  app.post("/intake/:id/reply", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = (request.body as { content?: string }) ?? {};
    if (!content?.trim()) {
      return reply.code(400).send({ error: "content_required" });
    }

    // Fetch the user name
    const user = await prisma.user.findUnique({
      where: { id: request.user!.sub },
      select: { name: true },
    });

    const message = await prisma.intakeMessage.create({
      data: {
        leadId: id,
        role: "STAFF",
        content: content.trim(),
        senderName: user?.name ?? null,
      },
    });

    leadBroadcast("updated", id, request.user!.sub);
    return reply.code(201).send(message);
  });

  // POST /intake/:id/analyze — re-run AI analysis
  app.post("/intake/:id/analyze", async (request, reply) => {
    const { id } = request.params as { id: string };
    const exists = await prisma.intakeLead.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return reply.code(404).send({ error: "not_found" });

    // Run in background, return immediately
    analyzeIntake(id).catch(() => {});

    return { ok: true };
  });

  // DELETE /intake/:id — ADMIN only
  app.delete("/intake/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (request.user!.role !== "ADMIN") {
      return reply.code(403).send({ error: "forbidden" });
    }
    await prisma.intakeLead.delete({ where: { id } });
    leadBroadcast("deleted", id, request.user!.sub);
    return reply.code(204).send();
  });
}

function mapClassificationToPracticeArea(classification: string | null | undefined): string {
  const valid = [
    "PERSONAL_INJURY",
    "MARITIME",
    "JONES_ACT",
    "LHWCA",
    "PRODUCT_LIABILITY",
    "PREMISES_LIABILITY",
    "AUTO",
    "OTHER",
  ];
  return valid.includes(classification ?? "") ? (classification as string) : "PERSONAL_INJURY";
}
