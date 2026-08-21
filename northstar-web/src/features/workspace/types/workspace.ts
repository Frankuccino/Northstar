// Mirrors the backend TaskStatus union (northstar-api/src/types/task-status.ts).
// Keep these two in sync — the Board columns map 1:1 to these values.
export type TaskStatus =
  | "backlog"
  | "ai_drafting"
  | "ready"
  | "in_progress"
  | "needs_revision"
  | "validated"
  | "done";

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "ai_drafting",
  "ready",
  "in_progress",
  "needs_revision",
  "validated",
  "done",
];

// Ordered columns for the Board. This is the canonical left-to-right flow.
export const BOARD_COLUMNS: TaskStatus[] = [
  "backlog",
  "ai_drafting",
  "ready",
  "in_progress",
  "needs_revision",
  "validated",
  "done",
];

export const COLUMN_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  ai_drafting: "AI Drafting",
  ready: "Ready",
  in_progress: "In Progress",
  needs_revision: "Needs Revision",
  validated: "Validated",
  done: "Done",
};

// Frontend mirror of the backend WIP policy (northstar-api/src/services/
// workspace/state-machine.ts). Used only to *display* the cap and grey out a
// column that is full; the server remains authoritative on enforcement.
export const DEFAULT_WIP = 5;
export const WIP_LIMITS: Partial<Record<TaskStatus, number>> = {
  backlog: 8,
  in_progress: 4,
};

export function wipLimitFor(status: TaskStatus): number {
  return WIP_LIMITS[status] ?? DEFAULT_WIP;
}

export type SuggestionType =
  | "context"
  | "approach"
  | "checklist"
  | "draft"
  | "commit_guidance";

export type ValidationDecision = "accept" | "reject" | "edit";

export interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiSuggestion {
  id: number;
  taskId: number;
  version: number;
  type: SuggestionType;
  content: string;
  promptSnapshot: string | null;
  model: string | null;
  createdAt: string;
}

export interface TaskValidation {
  id: number;
  taskId: number;
  suggestionId: number;
  decision: ValidationDecision;
  reason: string | null;
  actorId: number;
  createdAt: string;
}

export interface CommitRecord {
  id: number;
  taskId: number;
  message: string;
  justification: string | null;
  approvedBy: number;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface CreateTaskInput {
  // `projectId` identifies the parent project via the URL (/workspace/:id/tasks);
  // it is NOT sent in the request body (the backend reads it from the param, so
  // the body must not echo it back — avoids a confused-deputy mismatch).
  projectId: number;
  title: string;
  description?: string;
  assigneeId?: number;
}

export interface GenerateSuggestionInput {
  type: SuggestionType;
}

export interface ValidateSuggestionInput {
  suggestionId: number;
  decision: ValidationDecision;
  reason?: string;
}

export interface ApproveCommitInput {
  message: string;
  justification: string;
}

// Mirrors the backend state machine (northstar-api/src/services/workspace/state-machine.ts).
// Used by the Board to grey out + disable columns that are NOT legal drop
// targets for the card being dragged, so the UI rejects illegal moves up front
// (the server still enforces as a final safety net).
const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  backlog: ["ai_drafting", "in_progress"],
  ai_drafting: ["ready", "backlog"],
  ready: ["in_progress", "backlog"],
  in_progress: ["needs_revision", "validated", "ready"],
  needs_revision: ["in_progress", "ai_drafting"],
  validated: ["done"],
  done: [],
};

export function legalNextStatuses(from: TaskStatus): TaskStatus[] {
  return [...TRANSITIONS[from]];
}
