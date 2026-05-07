import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";

export default function NotesTab({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["notes", caseId],
    queryFn: () => api.notes(caseId),
  });
  const create = useMutation({
    mutationFn: (text: string) => api.createNote(caseId, { body: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", caseId] });
      setBody("");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", caseId] }),
  });

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-lg font-semibold mb-3">Notes</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) create.mutate(body.trim());
        }}
        className="card p-3 mb-4"
      >
        <textarea
          placeholder="Add a note — case strategy, phone call summary, intake details…"
          className="input min-h-[80px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={create.isPending || !body.trim()}
          >
            {create.isPending ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-sm text-slate-500">No notes yet.</div>
      ) : (
        <ul className="space-y-3">
          {data!.map((n) => (
            <li key={n.id} className="card p-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <div>
                  <span className="font-medium text-slate-700">
                    {n.author?.name ?? "—"}
                  </span>{" "}
                  · {format(new Date(n.createdAt), "MMM d, yyyy h:mm a")}
                </div>
                <button
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => remove.mutate(n.id)}
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="text-sm whitespace-pre-wrap">{n.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
