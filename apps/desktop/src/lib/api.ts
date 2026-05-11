import type {
  AuthResponse,
  Case,
  Contact,
  DocumentMeta,
  CalendarEvent,
  Task,
  Note,
  User,
  IntakeLead,
  IntakeMessage,
} from "@claudio/shared";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "claudio.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // body wasn't JSON; keep statusText
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (body: { email: string; name: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<User>("/auth/me"),
  users: () => request<Pick<User, "id" | "name" | "email" | "role">[]>("/users"),

  // Cases
  cases: (q?: { q?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (q?.q) params.set("q", q.q);
    if (q?.status) params.set("status", q.status);
    const qs = params.toString();
    return request<Case[]>(`/cases${qs ? `?${qs}` : ""}`);
  },
  case: (id: string) => request<Case>(`/cases/${id}`),
  createCase: (body: Partial<Case>) =>
    request<Case>("/cases", { method: "POST", body: JSON.stringify(body) }),
  updateCase: (id: string, body: Partial<Case>) =>
    request<Case>(`/cases/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCase: (id: string) => request<void>(`/cases/${id}`, { method: "DELETE" }),

  // Contacts
  contacts: (caseId: string) => request<Contact[]>(`/cases/${caseId}/contacts`),
  createContact: (caseId: string, body: Partial<Contact>) =>
    request<Contact>(`/cases/${caseId}/contacts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateContact: (id: string, body: Partial<Contact>) =>
    request<Contact>(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: "DELETE" }),

  // Documents
  documents: (caseId: string) => request<DocumentMeta[]>(`/cases/${caseId}/documents`),
  uploadDocument: async (caseId: string, file: File, description?: string, tags?: string[]) => {
    const fd = new FormData();
    // Text fields must come BEFORE the file: @fastify/multipart only exposes
    // fields parsed up to the point the file part is streamed.
    if (description) fd.append("description", description);
    if (tags && tags.length) fd.append("tags", tags.join(","));
    fd.append("file", file);
    return request<DocumentMeta>(`/cases/${caseId}/documents`, { method: "POST", body: fd });
  },
  documentDownloadUrl: (id: string) => {
    const token = getToken();
    return `${API_URL}/documents/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),

  // Events
  events: (caseId: string) => request<CalendarEvent[]>(`/cases/${caseId}/events`),
  upcomingEvents: (days = 30) =>
    request<(CalendarEvent & { case: Pick<Case, "id" | "caseNumber" | "title"> })[]>(
      `/events/upcoming?days=${days}`,
    ),
  createEvent: (caseId: string, body: Partial<CalendarEvent>) =>
    request<CalendarEvent>(`/cases/${caseId}/events`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateEvent: (id: string, body: Partial<CalendarEvent>) =>
    request<CalendarEvent>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteEvent: (id: string) => request<void>(`/events/${id}`, { method: "DELETE" }),

  // Tasks
  tasks: (caseId: string) => request<Task[]>(`/cases/${caseId}/tasks`),
  myTasks: () =>
    request<(Task & { case: Pick<Case, "id" | "caseNumber" | "title"> })[]>("/tasks/mine"),
  createTask: (caseId: string, body: Partial<Task>) =>
    request<Task>(`/cases/${caseId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
  updateTask: (id: string, body: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  // Notes
  notes: (caseId: string) => request<Note[]>(`/cases/${caseId}/notes`),
  createNote: (caseId: string, body: { body: string }) =>
    request<Note>(`/cases/${caseId}/notes`, { method: "POST", body: JSON.stringify(body) }),
  updateNote: (id: string, body: { body: string }) =>
    request<Note>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteNote: (id: string) => request<void>(`/notes/${id}`, { method: "DELETE" }),

  // Intake
  intake: {
    counts: () => request<{ new: number }>("/intake/counts"),
    list: (q?: { status?: string; channel?: string; assigneeId?: string; q?: string }) => {
      const params = new URLSearchParams();
      if (q?.status) params.set("status", q.status);
      if (q?.channel) params.set("channel", q.channel);
      if (q?.assigneeId) params.set("assigneeId", q.assigneeId);
      if (q?.q) params.set("q", q.q);
      const qs = params.toString();
      return request<IntakeLead[]>(`/intake${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<IntakeLead>(`/intake/${id}`),
    update: (id: string, body: Partial<IntakeLead>) =>
      request<IntakeLead>(`/intake/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    assign: (id: string, assigneeId?: string) =>
      request<IntakeLead>(`/intake/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ assigneeId }),
      }),
    convert: (id: string) =>
      request<Case>(`/intake/${id}/convert`, { method: "POST" }),
    reply: (id: string, content: string) =>
      request<IntakeMessage>(`/intake/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    analyze: (id: string) =>
      request<{ ok: boolean }>(`/intake/${id}/analyze`, { method: "POST" }),
    delete: (id: string) => request<void>(`/intake/${id}`, { method: "DELETE" }),
  },

  // Public form (no auth needed — called from the firm website)
  submitPublicForm: (body: {
    name: string;
    email?: string;
    phone?: string;
    hearAboutUs?: string;
    description: string;
  }) =>
    request<{ ok: true }>("/intake/submit", { method: "POST", body: JSON.stringify(body) }),
};

export const apiUrl = API_URL;
