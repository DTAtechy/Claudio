import type { AIAnalysisProvider, AIAnalysisResult } from "./types.js";
import { env } from "../env.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";

const noneProvider: AIAnalysisProvider = {
  async analyze(): Promise<AIAnalysisResult> {
    return {
      classification: "OTHER",
      extractedFacts: {},
      priorityScore: 50,
      priorityReason: "AI analysis disabled",
      draftReply: "",
    };
  },
};

export const aiProvider: AIAnalysisProvider =
  env.AI_PROVIDER === "openai"
    ? new OpenAIProvider()
    : env.AI_PROVIDER === "none"
      ? noneProvider
      : new AnthropicProvider();

export type { AIAnalysisProvider, AIAnalysisResult };
