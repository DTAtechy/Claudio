import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Task, TaskPriority, TaskStatus } from "@claudio/shared";
import { api } from "@/lib/api";
import Dialog from "@/components/Dialog";

const STATUSES: TaskStatus[] = ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"];
const PRIORITIES: TaskPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default function TasksTab({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", caseId],
    queryFn: () => api.tasks(caseId),
  });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.users() });
  const [showNew, setShowNew] = useState(false);

  const create = useMutation({
    mutationFn: (body: Partial<Task>) => api.createTask(caseId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", caseId] }),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Task> }) =>
      api.updateTask(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", caseId] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", caseId] }),
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus className="size-4" /> Add task
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card p-6 text-center text-slate-500 text-sm">No tasks yet.</div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data!.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={t.status === "DONE"}
                  onChange={(e) =>
                    update.mutate({
                      id: t.id,
                      body: { status: e.target.checked ? "DONE" : "OPEN" },
                    })
                  }
                />
                <div>
                  <div
                    className={`text-sm font-medium ${
                      t.status === "DONE" ? "line-through text-slate-400" : ""
                    }`}
                  >
                    {t.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.priority.toLowerCase()} priority ·{" "}
                    {t.dueAt ? `due ${format(new Date(t.dueAt), "MMM d")}` : "no due date"}
                    {t.assignee ? ` · ${t.assignee.name}` : ""}
                  </div>
                  {t.description && (
                    <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                      {t.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="text-xs border border-slate-200 rounded px-1.5 py-1"
                  value={t.status}
                  onChange={(e) =>
                    update.mutate({ id: t.id, body: { status: e.target.value as TaskStatus } })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => remove.mutate(t.id)}
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewTaskDialog
          users={users.data ?? []}
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

function NewTaskDialog({
  users,
  onClose,
  onCreate,
}: {
  users: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (body: Partial<Task>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("NORMAL");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        title,
        description: description || null,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        assigneeId: assigneeId || null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="New task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due</label>
            <input
              type="date"
              className="input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select
            className="input"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
