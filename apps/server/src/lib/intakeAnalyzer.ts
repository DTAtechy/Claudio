import { prisma } from "./prisma.js";
import { aiProvider } from "./ai/index.js";
import { broadcast } from "./realtime.js";

export async function analyzeIntake(leadId: string): Promise<void> {
  const lead = await prisma.intakeLead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  try {
    const result = await aiProvider.analyze({
      callerName: lead.callerName,
      subject: lead.subject,
      body: lead.body,
    });

    await prisma.intakeLead.update({
      where: { id: leadId },
      data: {
        aiClassification: result.classification,
        aiExtractedFacts: result.extractedFacts as object,
        aiPriorityReason: result.priorityReason,
        aiDraftReply: result.draftReply,
        priority: result.priorityScore,
        aiProcessedAt: new Date(),
      },
    });
  } catch {
    // AI failure is non-fatal — lead is still created, just without AI fields
    return;
  }

  broadcast({
    entity: "intake",
    action: "updated",
    caseId: "intake",
    id: leadId,
    actorId: "system",
    at: new Date().toISOString(),
  });
}
