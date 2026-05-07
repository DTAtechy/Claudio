import { useState } from "react";
import type { Case, CasePracticeArea, CaseStatus } from "@claudio/shared";
import Dialog from "./Dialog";

const PRACTICE_AREAS: CasePracticeArea[] = [
  "PERSONAL_INJURY",
  "MARITIME",
  "JONES_ACT",
  "LHWCA",
  "PRODUCT_LIABILITY",
  "PREMISES_LIABILITY",
  "AUTO",
  "OTHER",
];
const STATUSES: CaseStatus[] = [
  "INTAKE",
  "ACTIVE",
  "LITIGATION",
  "SETTLEMENT",
  "CLOSED",
  "ARCHIVED",
];

export default function NewCaseDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (body: Partial<Case>) => Promise<void>;
}) {
  const [caseNumber, setCaseNumber] = useState("");
  const [title, setTitle] = useState("");
  const [practiceArea, setPracticeArea] = useState<CasePracticeArea>("PERSONAL_INJURY");
  const [status, setStatus] = useState<CaseStatus>("INTAKE");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [sol, setSol] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        caseNumber,
        title,
        practiceArea,
        status,
        description: description || null,
        incidentDate: incidentDate ? new Date(incidentDate).toISOString() : null,
        statuteOfLimitations: sol ? new Date(sol).toISOString() : null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="New case" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Case number</label>
            <input
              className="input"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
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
          <label className="label">Practice area</label>
          <select
            className="input"
            value={practiceArea}
            onChange={(e) => setPracticeArea(e.target.value as CasePracticeArea)}
          >
            {PRACTICE_AREAS.map((p) => (
              <option key={p} value={p}>
                {p.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Incident date</label>
            <input
              type="date"
              className="input"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Statute of limitations</label>
            <input
              type="date"
              className="input"
              value={sol}
              onChange={(e) => setSol(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
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
            {busy ? "Creating…" : "Create case"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
