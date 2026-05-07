import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEvent, EventKind } from "@claudio/shared";
import { api } from "@/lib/api";
import Dialog from "@/components/Dialog";

const KINDS: EventKind[] = [
  "DEADLINE",
  "STATUTE_OF_LIMITATIONS",
  "HEARING",
  "DEPOSITION",
  "MEDIATION",
  "TRIAL",
  "MEETING",
  "OTHER",
];

export default function CalendarTab({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["events", caseId],
    queryFn: () => api.events(caseId),
  });
  const [showNew, setShowNew] = useState(false);

  const create = useMutation({
    mutationFn: (body: Partial<CalendarEvent>) => api.createEvent(caseId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", caseId] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", caseId] }),
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Calendar & deadlines</h2>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus className="size-4" /> Add event
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card p-6 text-center text-slate-500 text-sm">
          No events yet. Add hearings, depositions, deadlines, and SOLs here.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data!.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{e.title}</div>
                <div className="text-xs text-slate-500">
                  <span className="uppercase tracking-wide">
                    {e.kind.replaceAll("_", " ").toLowerCase()}
                  </span>
                  {" · "}
                  {format(new Date(e.startsAt), "MMM d, yyyy h:mm a")}
                  {e.location ? ` · ${e.location}` : ""}
                  {e.source !== "INTERNAL" && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] uppercase">
                      {e.externalCategory ?? e.source.replace("_SYNC", "")}
                    </span>
                  )}
                </div>
                {e.notes && (
                  <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                    {e.notes}
                  </div>
                )}
              </div>
              <button
                className="text-slate-400 hover:text-red-600"
                onClick={() => remove.mutate(e.id)}
                title="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewEventDialog
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

function NewEventDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (body: Partial<CalendarEvent>) => Promise<void>;
}) {
  const [kind, setKind] = useState<EventKind>("DEADLINE");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        kind,
        title,
        startsAt: new Date(startsAt).toISOString(),
        allDay,
        location: location || null,
        notes: notes || null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="New event" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kind</label>
            <select
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as EventKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Starts at</label>
            <input
              type="datetime-local"
              className="input"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Location</label>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {err && <div className="text-xs text-red-600">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
