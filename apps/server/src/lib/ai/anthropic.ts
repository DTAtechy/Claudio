import Anthropic from "@anthropic-ai/sdk";
import type { AIAnalysisProvider, AIAnalysisResult } from "./types.js";
import { env } from "../env.js";

const PRACTICE_AREAS = [
  "PERSONAL_INJURY",
  "MARITIME",
  "JONES_ACT",
  "LHWCA",
  "PRODUCT_LIABILITY",
  "PREMISES_LIABILITY",
  "AUTO",
  "OTHER",
] as const;

const analyzeToolDef: Anthropic.Tool = {
  name: "record_analysis",
  description: "Record structured analysis of an intake inquiry for a personal injury / maritime law firm",
  input_schema: {
    type: "object" as const,
    properties: {
      classification: {
        type: "string",
        enum: PRACTICE_AREAS,
        description: "Most likely practice area",
      },
      extractedFacts: {
        type: "object",
        properties: {
          incidentDate: { type: "string", description: "ISO date of incident if mentioned" },
          injuryType: { type: "string", description: "Type of injury or legal issue" },
          location: { type: "string", description: "Location of incident" },
          parties: { type: "array", items: { type: "string" } },
          urgencyFlags: { type: "array", items: { type: "string" }, description: "Urgency indicators (e.g. SOL deadline, hospitalized)" },
        },
      },
      priorityScore: {
        type: "number",
        description: "Priority 0–100 (100 = most urgent)",
      },
      priorityReason: { type: "string" },
      draftReply: {
        type: "string",
        description: "Professional, empathetic reply to the prospective client",
      },
    },
    required: ["classification", "extractedFacts", "priorityScore", "priorityReason", "draftReply"],
  },
};

export class AnthropicProvider implements AIAnalysisProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async analyze(lead: {
    callerName?: string | null;
    subject?: string | null;
    body: string;
  }): Promise<AIAnalysisResult> {
    const content = [
      lead.callerName ? `Caller: ${lead.callerName}` : null,
      lead.subject ? `Subject: ${lead.subject}` : null,
      `Message:\n${lead.body}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You are an intake analyst for a personal injury and maritime law firm. Analyze the inquiry and extract key information.",
      tools: [analyzeToolDef],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("AI did not return a tool_use block");
    }
    return toolUse.input as AIAnalysisResult;
  }
}
