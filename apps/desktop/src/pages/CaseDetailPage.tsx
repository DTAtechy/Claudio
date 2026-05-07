import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { openCaseSocket } from "@/lib/realtime";
import OverviewTab from "@/components/case-tabs/OverviewTab";
import ContactsTab from "@/components/case-tabs/ContactsTab";
import DocumentsTab from "@/components/case-tabs/DocumentsTab";
import CalendarTab from "@/components/case-tabs/CalendarTab";
import TasksTab from "@/components/case-tabs/TasksTab";
import NotesTab from "@/components/case-tabs/NotesTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "contacts", label: "Contacts" },
  { key: "documents", label: "Documents" },
  { key: "calendar", label: "Calendar" },
  { key: "tasks", label: "Tasks" },
  { key: "notes", label: "Notes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("overview");
  const qc = useQueryClient();

  const { data: c, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => api.case(id!),
    enabled: !!id,
  });

  // Subscribe to the case's realtime stream and invalidate the relevant
  // queries so all tabs update live as collaborators make changes.
  useEffect(() => {
    if (!id) return;
    const close = openCaseSocket(id, (msg) => {
      switch (msg.entity) {
        case "case":
          qc.invalidateQueries({ queryKey: ["case", id] });
          qc.invalidateQueries({ queryKey: ["cases"] });
          break;
        case "contact":
          qc.invalidateQueries({ queryKey: ["contacts", id] });
          break;
        case "document":
          qc.invalidateQueries({ queryKey: ["documents", id] });
          break;
        case "event":
          qc.invalidateQueries({ queryKey: ["events", id] });
          break;
        case "task":
          qc.invalidateQueries({ queryKey: ["tasks", id] });
          break;
        case "note":
          qc.invalidateQueries({ queryKey: ["notes", id] });
          break;
      }
    });
    return close;
  }, [id, qc]);

  if (!id) return null;
  if (isLoading || !c) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="flex flex-col h-full">
      <header className="px-8 pt-6 pb-3 border-b border-slate-200 bg-white">
        <Link
          to="/cases"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-3" /> All cases
        </Link>
        <div className="flex items-end justify-between mt-2">
          <div>
            <h1 className="text-xl font-semibold">{c.title}</h1>
            <div className="text-xs text-slate-500 mt-0.5">
              {c.caseNumber} · {c.practiceArea.replaceAll("_", " ").toLowerCase()} ·{" "}
              <span className="uppercase tracking-wide">{c.status}</span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            {c.statuteOfLimitations && (
              <div>
                <span className="text-amber-700 font-medium">SOL:</span>{" "}
                {format(new Date(c.statuteOfLimitations), "MMM d, yyyy")} (
                {formatDistanceToNow(new Date(c.statuteOfLimitations), { addSuffix: true })})
              </div>
            )}
            {c.incidentDate && (
              <div>Incident: {format(new Date(c.incidentDate), "MMM d, yyyy")}</div>
            )}
          </div>
        </div>
        <nav className="mt-4 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                tab === t.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="flex-1 overflow-auto">
        {tab === "overview" && <OverviewTab caseId={id} />}
        {tab === "contacts" && <ContactsTab caseId={id} />}
        {tab === "documents" && <DocumentsTab caseId={id} />}
        {tab === "calendar" && <CalendarTab caseId={id} />}
        {tab === "tasks" && <TasksTab caseId={id} />}
        {tab === "notes" && <NotesTab caseId={id} />}
      </div>
    </div>
  );
}
