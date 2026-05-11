import type { IntakeLead } from "@claudio/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

const AREA_LABELS: Record<string, string> = {
  PERSONAL_INJURY: "Personal Injury",
  MARITIME: "Maritime",
  JONES_ACT: "Jones Act",
  LHWCA: "LHWCA",
  PRODUCT_LIABILITY: "Product Liability",
  PREMISES_LIABILITY: "Premises Liability",
  AUTO: "Auto",
  OTHER: "Other",
};

export function IntakeAIPanel({
  lead,
  onUseDraftReply,
}: {
  lead: IntakeLead;
  onUseDraftReply: (text: string) => void;
}) {
  const queryClient = useQueryClient();

  const analyzeMut = useMutation({
    mutationFn: () => api.intake.analyze(lead.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["intake", lead.id] });
    },
  });

  if (!lead.aiProcessedAt && !analyzeMut.isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
        <Brain className="size-8 opacity-40" />
        <p className="text-sm">No AI analysis yet.</p>
        <button
          onClick={() => analyzeMut.mutate()}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
        >
          <Brain className="size-3.5" /> Run Analysis
        </button>
      </div>
    );
  }

  if (analyzeMut.isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
        <RefreshCw className="size-6 animate-spin opacity-60" />
        <p className="text-sm">Analyzing…</p>
      </div>
    );
  }

  const facts = (lead.aiExtractedFacts ?? {}) as Record<string, unknown>;

  return (
    <div className="p-4 space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Brain className="size-4" /> AI Analysis
        </h3>
        <button
          onClick={() => analyzeMut.mutate()}
          disabled={analyzeMut.isPending}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <RefreshCw className="size-3" /> Re-analyze
        </button>
      </div>

      {/* Classification */}
      {lead.aiClassification && (
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wide">Practice Area</span>
          <div className="mt-0.5">
            <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
              {AREA_LABELS[lead.aiClassification] ?? lead.aiClassification}
            </span>
          </div>
        </div>
      )}

      {/* Priority */}
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Priority Score</span>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                lead.priority >= 80
                  ? "bg-red-500"
                  : lead.priority >= 50
                    ? "bg-orange-400"
                    : "bg-slate-300"
              }`}
              style={{ width: `${lead.priority}%` }}
            />
          </div>
          <span className="font-mono text-xs">{lead.priority}/100</span>
        </div>
        {lead.aiPriorityReason && (
          <p className="mt-1 text-xs text-slate-500 italic">{lead.aiPriorityReason}</p>
        )}
      </div>

      {/* Extracted Facts */}
      {Object.keys(facts).length > 0 && (
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wide">Extracted Facts</span>
          <table className="mt-1 w-full text-xs border-collapse">
            <tbody>
              {Object.entries(facts).map(([k, v]) => {
                if (!v || (Array.isArray(v) && (v as unknown[]).length === 0)) return null;
                const display = Array.isArray(v) ? (v as unknown[]).join(", ") : String(v);
                return (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="py-1 pr-2 text-slate-500 capitalize align-top whitespace-nowrap">
                      {k.replace(/([A-Z])/g, " $1").trim()}
                    </td>
                    <td className="py-1 text-slate-700">{display}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Draft Reply */}
      {lead.aiDraftReply && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Draft Reply</span>
            <button
              onClick={() => onUseDraftReply(lead.aiDraftReply!)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Use this reply
            </button>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 rounded p-2 whitespace-pre-wrap border border-slate-200">
            {lead.aiDraftReply}
          </p>
        </div>
      )}
    </div>
  );
}
