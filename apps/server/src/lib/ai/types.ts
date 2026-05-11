export interface AIAnalysisResult {
  classification: string;
  extractedFacts: {
    incidentDate?: string;
    injuryType?: string;
    location?: string;
    parties?: string[];
    urgencyFlags?: string[];
  };
  priorityScore: number;
  priorityReason: string;
  draftReply: string;
}

export interface AIAnalysisProvider {
  analyze(lead: {
    callerName?: string | null;
    subject?: string | null;
    body: string;
  }): Promise<AIAnalysisResult>;
}
