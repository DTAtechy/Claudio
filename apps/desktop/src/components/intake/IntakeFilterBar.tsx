import type { IntakeChannel, IntakeStatus } from "@claudio/shared";
import type { User } from "@claudio/shared";

export interface IntakeFilters {
  status: IntakeStatus | "";
  channel: IntakeChannel | "";
  assigneeId: string;
  q: string;
}

const STATUSES: { value: IntakeStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
  { value: "SPAM", label: "Spam" },
];

const CHANNELS: { value: IntakeChannel | ""; label: string }[] = [
  { value: "", label: "All channels" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "CHAT", label: "Chat" },
  { value: "WEB_FORM", label: "Web Form" },
  { value: "SMS", label: "SMS" },
];

export function IntakeFilterBar({
  filters,
  onChange,
  users,
}: {
  filters: IntakeFilters;
  onChange: (f: Partial<IntakeFilters>) => void;
  users: Pick<User, "id" | "name">[];
}) {
  return (
    <div className="flex flex-wrap gap-2 p-3 border-b border-slate-200 bg-white">
      <input
        type="search"
        placeholder="Search leads…"
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
        className="border border-slate-200 rounded-md px-2 py-1 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-slate-400"
      />
      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value as IntakeStatus | "" })}
        className="border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        value={filters.channel}
        onChange={(e) => onChange({ channel: e.target.value as IntakeChannel | "" })}
        className="border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        {CHANNELS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={filters.assigneeId}
        onChange={(e) => onChange({ assigneeId: e.target.value })}
        className="border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
      >
        <option value="">All assignees</option>
        <option value="me">Assigned to me</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
