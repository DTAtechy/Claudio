import type { FastifyInstance } from "fastify";
import { promises as fs, createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../lib/realtime.js";
import { env } from "../lib/env.js";

async function ensureCaseDir(caseId: string): Promise<string> {
  const dir = path.resolve(env.STORAGE_DIR, "cases", caseId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function serializeDoc(d: {
  id: string;
  caseId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedBy?: { id: string; name: string } | null;
  description: string | null;
  tags: string[];
  version: number;
  source: string;
  externalUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: d.id,
    caseId: d.caseId,
    filename: d.filename,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    uploadedById: d.uploadedById,
    uploadedBy: d.uploadedBy ?? null,
    description: d.description,
    tags: d.tags,
    version: d.version,
    source: d.source,
    externalUrl: d.externalUrl,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function documentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/cases/:caseId/documents", async (request) => {
    const { caseId } = request.params as { caseId: string };
    const docs = await prisma.document.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    return docs.map(serializeDoc);
  });

  app.post("/cases/:caseId/documents", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const file = await request.file({ limits: { fileSize: 200 * 1024 * 1024 } });
    if (!file) {
      return reply.code(400).send({ error: "no_file" });
    }
    const fields = file.fields as Record<string, { value?: string } | undefined>;
    const description = fields.description?.value ?? null;
    const tagsRaw = fields.tags?.value ?? "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const dir = await ensureCaseDir(caseId);
    const ext = path.extname(file.filename) || "";
    const storedName = `${crypto.randomUUID()}${ext}`;
    const fullPath = path.join(dir, storedName);

    let bytesWritten = 0;
    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(fullPath);
      file.file.on("data", (chunk: Buffer) => {
        bytesWritten += chunk.length;
      });
      file.file.pipe(ws);
      ws.on("finish", () => resolve());
      ws.on("error", reject);
      file.file.on("error", reject);
    });

    const doc = await prisma.document.create({
      data: {
        caseId,
        filename: file.filename,
        storagePath: path.join("cases", caseId, storedName),
        mimeType: file.mimetype || "application/octet-stream",
        sizeBytes: bytesWritten,
        uploadedById: request.user!.sub,
        description,
        tags,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    broadcast({
      entity: "document",
      action: "created",
      caseId,
      id: doc.id,
      data: serializeDoc(doc),
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(201).send(serializeDoc(doc));
  });

  app.get("/documents/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return reply.code(404).send({ error: "not_found" });
    // SharePoint-linked documents have no local file; clients should follow
    // externalUrl instead of hitting this endpoint.
    if (!doc.storagePath) {
      return reply.code(409).send({ error: "external_document", externalUrl: doc.externalUrl });
    }
    const full = path.resolve(env.STORAGE_DIR, doc.storagePath);
    try {
      await fs.access(full);
    } catch {
      return reply.code(410).send({ error: "file_missing" });
    }
    reply.header(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(doc.filename)}"`,
    );
    reply.type(doc.mimeType);
    return reply.send(createReadStream(full));
  });

  app.delete("/documents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return reply.code(404).send({ error: "not_found" });
    await prisma.document.delete({ where: { id } });
    if (doc.storagePath) {
      const full = path.resolve(env.STORAGE_DIR, doc.storagePath);
      fs.unlink(full).catch(() => {});
    }
    broadcast({
      entity: "document",
      action: "deleted",
      caseId: doc.caseId,
      id,
      actorId: request.user!.sub,
      at: new Date().toISOString(),
    });
    return reply.code(204).send();
  });
}
