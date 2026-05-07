// Shared types between desktop client and server.
// Keep these aligned with the Prisma schema in apps/server/prisma/schema.prisma.

export type Role = "ADMIN" | "ATTORNEY" | "STAFF";

export type CaseStatus =
  | "INTAKE"
  | "ACTIVE"
  | "LITIGATION"
  | "SETTLEMENT"
  | "CLOSED"
  | "ARCHIVED";

export type CasePracticeArea =
  | "PERSONAL_INJURY"
  | "MARITIME"
  | "JONES_ACT"
  | "LHWCA"
  | "PRODUCT_LIABILITY"
  | "PREMISES_LIABILITY"
  | "AUTO"
  | "OTHER";

export type ContactType =
  | "CLIENT"
  | "OPPOSING_PARTY"
  | "OPPOSING_COUNSEL"
  | "WITNESS"
  | "EXPERT"
  | "MEDICAL_PROVIDER"
  | "INSURANCE_ADJUSTER"
  | "COURT"
  | "OTHER";

export type EventKind =
  | "DEADLINE"
  | "STATUTE_OF_LIMITATIONS"
  | "HEARING"
  | "DEPOSITION"
  | "MEDIATION"
  | "TRIAL"
  | "MEETING"
  | "OTHER";

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SyncSource =
  | "INTERNAL"
  | "OUTLOOK_SYNC"
  | "SHAREPOINT_SYNC"
  | "LAWTOOLBOX";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  status: CaseStatus;
  practiceArea: CasePracticeArea;
  description?: string | null;
  incidentDate?: string | null;
  statuteOfLimitations?: string | null;
  openedAt: string;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  caseId: string;
  type: ContactType;
  name: string;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMeta {
  id: string;
  caseId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedBy?: Pick<User, "id" | "name"> | null;
  description?: string | null;
  tags: string[];
  version: number;
  source: SyncSource;
  externalUrl?: string | null;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  caseId: string;
  kind: EventKind;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  location?: string | null;
  notes?: string | null;
  source: SyncSource;
  externalCategory?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  assigneeId?: string | null;
  assignee?: Pick<User, "id" | "name"> | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  caseId: string;
  authorId: string;
  author?: Pick<User, "id" | "name"> | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// Realtime broadcast envelope used by the WebSocket layer.
export type RealtimeEntity =
  | "case"
  | "contact"
  | "document"
  | "event"
  | "task"
  | "note";
export type RealtimeAction = "created" | "updated" | "deleted";

export interface RealtimeMessage<T = unknown> {
  entity: RealtimeEntity;
  action: RealtimeAction;
  caseId: string;
  id: string;
  data?: T;
  actorId: string;
  at: string;
}
