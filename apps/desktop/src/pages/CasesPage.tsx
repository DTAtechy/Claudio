import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import type { Case } from "@claudio/shared";
import NewCaseDialog from "@/components/NewCaseDialog";

export default function CasesPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cases", q, statusFilter],
    queryFn: () => api.cases({ q: q || undefined, status: statusFilter || undefined }),
  });

  const create = useMutation({
    mutationFn: (body: Partial<Case>) => api.createCase(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const cases = data ?? [];
  const grouped = useMemo(() => groupByStatus(cases), [cases]);

  return (
    <div className="p-8 max-w-6xl">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Cases</h1>
          <p className="text-sm text-slate-500">All matters in your firm.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus className="size-4" /> New case
        </button>
      </header>

      <div className="card p-3 mb-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by title, case number, description"
            className="input pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : cases.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No cases yet. Create your first one.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([status, group]) => (
            <section key={status}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                {status.replaceAll("_", " ")} · {group.length}
              </h2>
              <div className="card divide-y divide-slate-100">
                {group.map((c) => (
                  <Link
                    key={c.id}
                    to={`/cases/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-medium text-sm">{c.title}</div>
                      <div className="text-xs text-slate-500">
                        {c.caseNumber} · {c.practiceArea.replaceAll("_", " ").toLowerCase()}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 text-right">
                      {c.statuteOfLimitations ? (
                        <div>
                          SOL: {format(new Date(c.statuteOfLimitations), "MMM d, yyyy")}
                        </div>
                      ) : null}
                      <div className="text-slate-400">
                        Updated {format(new Date(c.updatedAt), "MMM d")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showNew && (
        <NewCaseDialog
          onClose={() => setShowNew(false)}
          onCreate={async (body) => {
            await create.mutateAsync(body);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

const STATUSES = [
  "INTAKE",
  "ACTIVE",
  "LITIGATION",
  "SETTLEMENT",
  "CLOSED",
  "ARCHIVED",
] as const;

function groupByStatus(cases: Case[]): Record<string, Case[]> {
  const out: Record<string, Case[]> = {};
  for (const c of cases) {
    (out[c.status] ||= []).push(c);
  }
  // Preserve a sensible order.
  const ordered: Record<string, Case[]> = {};
  for (const s of STATUSES) {
    if (out[s]?.length) ordered[s] = out[s];
  }
  return ordered;
}
