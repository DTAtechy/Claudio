import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";

export default function OverviewTab({ caseId }: { caseId: string }) {
  const { data: c } = useQuery({ queryKey: ["case", caseId], queryFn: () => api.case(caseId) });
  const contacts = useQuery({
    queryKey: ["contacts", caseId],
    queryFn: () => api.contacts(caseId),
  });
  const events = useQuery({
    queryKey: ["events", caseId],
    queryFn: () => api.events(caseId),
  });
  const tasks = useQuery({ queryKey: ["tasks", caseId], queryFn: () => api.tasks(caseId) });

  if (!c) return null;
  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
      <section className="card p-5 lg:col-span-2">
        <h2 className="font-semibold mb-2">Description</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">
          {c.description || (
            <span className="text-slate-400">No description yet.</span>
          )}
        </p>
      </section>
      <section className="card p-5 space-y-2 text-sm">
        <Row label="Case #" value={c.caseNumber} />
        <Row label="Status" value={c.status.replaceAll("_", " ")} />
        <Row label="Practice" value={c.practiceArea.replaceAll("_", " ")} />
        <Row
          label="Opened"
          value={format(new Date(c.openedAt), "MMM d, yyyy")}
        />
        <Row
          label="Incident"
          value={c.incidentDate ? format(new Date(c.incidentDate), "MMM d, yyyy") : "—"}
        />
        <Row
          label="SOL"
          value={
            c.statuteOfLimitations
              ? format(new Date(c.statuteOfLimitations), "MMM d, yyyy")
              : "—"
          }
        />
      </section>
      <section className="card p-5 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <Counter label="Contacts" value={contacts.data?.length ?? "—"} />
        <Counter label="Events" value={events.data?.length ?? "—"} />
        <Counter label="Open tasks" value={
          (tasks.data ?? []).filter((t) => t.status !== "DONE").length
        } />
        <Counter label="Done tasks" value={
          (tasks.data ?? []).filter((t) => t.status === "DONE").length
        } />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
