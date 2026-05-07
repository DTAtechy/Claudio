import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";

export default function DocumentsTab({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["documents", caseId],
    queryFn: () => api.documents(caseId),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", caseId] }),
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      await api.uploadDocument(caseId, file);
      qc.invalidateQueries({ queryKey: ["documents", caseId] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Documents</h2>
        <button
          className="btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" hidden onChange={onPick} />
      </div>
      {err && <div className="text-xs text-red-600 mb-2">{err}</div>}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card p-6 text-center text-slate-500 text-sm">
          No documents yet. Upload PDFs, images, Word/Excel files — anything case-related.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data!.map((d) => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{d.filename}</div>
                <div className="text-xs text-slate-500">
                  {formatBytes(d.sizeBytes)} ·{" "}
                  {format(new Date(d.createdAt), "MMM d, yyyy h:mm a")} ·{" "}
                  {d.uploadedBy?.name ?? "—"}
                  {d.source !== "INTERNAL" && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] uppercase">
                      {d.source.replace("_SYNC", "")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="btn-secondary"
                  href={
                    d.source === "SHAREPOINT_SYNC" && d.externalUrl
                      ? d.externalUrl
                      : api.documentDownloadUrl(d.id)
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="size-4" /> Download
                </a>
                <button
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => remove.mutate(d.id)}
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
