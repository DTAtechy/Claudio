import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import type { Contact, ContactType } from "@claudio/shared";
import { api } from "@/lib/api";
import Dialog from "@/components/Dialog";

const TYPES: ContactType[] = [
  "CLIENT",
  "OPPOSING_PARTY",
  "OPPOSING_COUNSEL",
  "WITNESS",
  "EXPERT",
  "MEDICAL_PROVIDER",
  "INSURANCE_ADJUSTER",
  "COURT",
  "OTHER",
];

export default function ContactsTab({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["contacts", caseId],
    queryFn: () => api.contacts(caseId),
  });
  const [showNew, setShowNew] = useState(false);

  const create = useMutation({
    mutationFn: (body: Partial<Contact>) => api.createContact(caseId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", caseId] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", caseId] }),
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus className="size-4" /> Add contact
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card p-6 text-center text-slate-500 text-sm">
          No contacts yet.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {data!.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-slate-500">
                  {c.type.replaceAll("_", " ").toLowerCase()}
                  {c.organization ? ` · ${c.organization}` : ""}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {[c.email, c.phone].filter(Boolean).join(" · ")}
                </div>
                {c.notes && (
                  <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">
                    {c.notes}
                  </div>
                )}
              </div>
              <button
                className="text-slate-400 hover:text-red-600"
                onClick={() => remove.mutate(c.id)}
                title="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewContactDialog
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

function NewContactDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (body: Partial<Contact>) => Promise<void>;
}) {
  const [type, setType] = useState<ContactType>("CLIENT");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        type,
        name,
        organization: organization || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="New contact" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as ContactType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Organization</label>
          <input className="input" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
