import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IntakeLead, IntakeStatus, User } from "@claudio/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightCircle, Mail, MessageSquare, Phone, Send, X } from "lucide-react";
import { api } from "@/lib/api";
import { IntakeAIPanel } from "./IntakeAIPanel";

const STATUS_OPTIONS: { value: IntakeStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
  { value: "SPAM", label: "Spam" },
];

type Tab = "message" | "ai" | "chat";

export function IntakeLeadDetail({
  lead,
  users,
  onClose,
}: {
  lead: IntakeLead;
  users: Pick<User, "id" | "name">[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("message");
  const [replyText, setReplyText] = useState("");
  const [converting, setConverting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["intake"] });
    void queryClient.invalidateQueries({ queryKey: ["intake", lead.id] });
    void queryClient.invalidateQueries({ queryKey: ["intake-counts"] });
  };

  const updateMut = useMutation({
    mutationFn: (body: Partial<IntakeLead>) => api.intake.update(lead.id, body),
    onSuccess: invalidate,
  });

  const assignMut = useMutation({
    mutationFn: (assigneeId: string) => api.intake.assign(lead.id, assigneeId),
    onSuccess: invalidate,
  });

  const replyMut = useMutation({
    mutationFn: (content: string) => api.intake.reply(lead.id, content),
    onSuccess: () => {
      setReplyText("");
      invalidate();
    },
  });

  const convertMut = useMutation({
    mutationFn: () => api.intake.convert(lead.id),
    onSuccess: (newCase) => {
      invalidate();
      navigate(`/cases/${newCase.id}`);
    },
  });

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 truncate">
            {lead.callerName ?? lead.email ?? "Unknown"}
          </div>
          {lead.subject && (
            <div className="text-xs text-slate-500 truncate">{lead.subject}</div>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
            {lead.email && (
              <span className="flex items-center gap-0.5">
                <Mail className="size-3" /> {lead.email}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-0.5">
                <Phone className="size-3" /> {lead.phone}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
          <X className="size-4" />
        </button>
      </div>

      {/* Actions bar */}
      <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
        <select
          value={lead.status}
          onChange={(e) => updateMut.mutate({ status: e.target.value as IntakeStatus })}
          className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={lead.assignedToId ?? ""}
          onChange={(e) => assignMut.mutate(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {lead.status !== "CONVERTED" && (
          <button
            onClick={() => {
              if (converting) convertMut.mutate();
              else setConverting(true);
            }}
            disabled={convertMut.isPending}
            className="ml-auto flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded"
          >
            <ArrowRightCircle className="size-3.5" />
            {converting ? "Confirm Convert" : "Convert to Case"}
          </button>
        )}
        {converting && !convertMut.isPending && (
          <button
            onClick={() => setConverting(false)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        )}
        {lead.convertedToCaseId && (
          <button
            onClick={() => navigate(`/cases/${lead.convertedToCaseId}`)}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800"
          >
            View Case →
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-4">
        {(["message", "ai", "chat"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "message" ? "Message" : t === "ai" ? "AI Analysis" : "Chat"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "message" && (
          <div className="p-4 space-y-3">
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-3 border border-slate-100 text-sm">
              {lead.body}
            </div>
            {lead.source && (
              <p className="text-xs text-slate-400">Source: {lead.source}</p>
            )}
          </div>
        )}

        {tab === "ai" && (
          <IntakeAIPanel
            lead={lead}
            onUseDraftReply={(text) => {
              setReplyText(text);
              setTab("chat");
            }}
          />
        )}

        {tab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(lead.messages ?? []).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-0.5 ${msg.role === "STAFF" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "STAFF"
                        ? "bg-blue-600 text-white"
                        : msg.role === "AI"
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {msg.senderName ?? (msg.role === "AI" ? "AI" : "Client")}
                  </span>
                </div>
              ))}
              {(lead.messages ?? []).length === 0 && (
                <p className="text-center text-sm text-slate-400 py-6">No messages yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reply composer (always visible) */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <textarea
            rows={2}
            placeholder="Type a reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && replyText.trim()) {
                replyMut.mutate(replyText.trim());
              }
            }}
          />
          <button
            onClick={() => replyText.trim() && replyMut.mutate(replyText.trim())}
            disabled={!replyText.trim() || replyMut.isPending}
            className="self-end bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 rounded-md"
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">⌘+Enter to send</p>
      </div>
    </div>
  );
}
