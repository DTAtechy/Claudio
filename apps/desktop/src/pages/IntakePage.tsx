import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { IntakeLead } from "@claudio/shared";
import { Inbox } from "lucide-react";
import { api } from "@/lib/api";
import { openIntakeSocket } from "@/lib/realtime";
import { IntakeFilterBar, type IntakeFilters } from "@/components/intake/IntakeFilterBar";
import { IntakeLeadList } from "@/components/intake/IntakeLeadList";
import { IntakeLeadDetail } from "@/components/intake/IntakeLeadDetail";

const DEFAULT_FILTERS: IntakeFilters = {
  status: "",
  channel: "",
  assigneeId: "",
  q: "",
};

export default function IntakePage() {
  const [filters, setFilters] = useState<IntakeFilters>(DEFAULT_FILTERS);
  const [selectedLead, setSelectedLead] = useState<IntakeLead | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.users(),
    staleTime: 5 * 60_000,
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["intake", filters],
    queryFn: () =>
      api.intake.list({
        status: filters.status || undefined,
        channel: filters.channel || undefined,
        assigneeId: filters.assigneeId || undefined,
        q: filters.q || undefined,
      }),
  });

  // Keep selected lead in sync with list data
  const { data: detailLead } = useQuery({
    queryKey: ["intake", selectedLead?.id],
    queryFn: () => api.intake.get(selectedLead!.id),
    enabled: !!selectedLead?.id,
    staleTime: 30_000,
  });

  // Real-time updates via WebSocket
  useEffect(() => {
    const close = openIntakeSocket((msg) => {
      if (msg.entity === "intake") {
        void queryClient.invalidateQueries({ queryKey: ["intake"] });
        void queryClient.invalidateQueries({ queryKey: ["intake-counts"] });
      }
    });
    return close;
  }, [queryClient]);

  const displayLead = detailLead ?? selectedLead;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3">
        <Inbox className="size-5 text-slate-600" />
        <h1 className="text-lg font-semibold text-slate-800">Intake</h1>
        {leads.length > 0 && (
          <span className="text-xs text-slate-500">{leads.length} lead{leads.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — list */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
          <IntakeFilterBar
            filters={filters}
            onChange={(partial) => setFilters((f) => ({ ...f, ...partial }))}
            users={users}
          />
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Loading…
            </div>
          ) : (
            <IntakeLeadList
              leads={leads}
              selectedId={selectedLead?.id}
              onSelect={(lead) => setSelectedLead(lead)}
            />
          )}
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 overflow-hidden">
          {displayLead ? (
            <IntakeLeadDetail
              lead={displayLead}
              users={users}
              onClose={() => setSelectedLead(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <Inbox className="size-10 opacity-30" />
              <p className="text-sm">Select a lead to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
