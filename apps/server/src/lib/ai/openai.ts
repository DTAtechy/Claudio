import OpenAI from "openai";
import type { AIAnalysisProvider, AIAnalysisResult } from "./types.js";
import { env } from "../env.js";

const SYSTEM_PROMPT = `You are an intake analyst for a personal injury and maritime law firm.
Analyze the incoming inquiry and return a JSON object with exactly these fields:
{
  "classification": one of PERSONAL_INJURY|MARITIME|JONES_ACT|LHWCA|PRODUCT_LIABILITY|PREMISES_LIABILITY|AUTO|OTHER,
  "extractedFacts": {
    "incidentDate": string (ISO),
    "injuryType": string,
    "location": string,
    "parties": string[],
    "urgencyFlags": string[]
  },
  "priorityScore": number 0-100 (100 = most urgent),
  "priorityReason": string,
  "draftReply": string (professional, empathetic reply to prospective client)
}`;

export class OpenAIProvider implements AIAnalysisProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
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

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(text) as AIAnalysisResult;
  }
}
