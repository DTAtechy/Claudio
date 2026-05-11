import type { IntakeLead, IntakeChannel, IntakeStatus } from "@claudio/shared";
import { Globe, Mail, MessageSquare, Phone, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CHANNEL_ICON: Record<IntakeChannel, React.ReactNode> = {
  EMAIL: <Mail className="size-3.5" />,
  PHONE: <Phone className="size-3.5" />,
  CHAT: <MessageSquare className="size-3.5" />,
  WEB_FORM: <Globe className="size-3.5" />,
  SMS: <Smartphone className="size-3.5" />,
};

const STATUS_COLORS: Record<IntakeStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  CONVERTED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-100 text-slate-600",
  SPAM: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<IntakeStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  CONVERTED: "Converted",
  CLOSED: "Closed",
  SPAM: "Spam",
};

function PriorityBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-red-500" : value >= 50 ? "bg-orange-400" : "bg-slate-300";
  return (
    <div className="w-10 h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function IntakeLeadList({
  leads,
  selectedId,
  onSelect,
}: {
  leads: IntakeLead[];
  selectedId?: string;
  onSelect: (lead: IntakeLead) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        No leads match your filters.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
      {leads.map((lead) => (
        <button
          key={lead.id}
          onClick={() => onSelect(lead)}
          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
            selectedId === lead.id ? "bg-slate-100" : ""
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-400">{CHANNEL_ICON[lead.channel]}</span>
            <PriorityBar value={lead.priority} />
            <span
              className={`ml-auto text-[10px] font-medium rounded px-1.5 py-0.5 ${STATUS_COLORS[lead.status]}`}
            >
              {STATUS_LABELS[lead.status]}
            </span>
          </div>
          <div className="font-medium text-sm text-slate-800 truncate">
            {lead.callerName ?? lead.email ?? "Unknown"}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {lead.subject ?? lead.body.slice(0, 80)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-400">
              {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
            </span>
            {lead.assignedTo && (
              <span className="text-[10px] text-slate-400">{lead.assignedTo.name}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
