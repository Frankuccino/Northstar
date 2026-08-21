import type { TaskStatus } from "../../types/task-status.js";

// Server-authoritative state machine. The board UI calls moveTask; this map is
// the ONLY place transitions are defined, so an illegal move is rejected here
// regardless of what the client sends. This is the doc's core invariant:
// the server — not the UI — owns card legitimacy.
const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  backlog: ["ai_drafting", "in_progress"],
  ai_drafting: ["ready", "backlog"],
  ready: ["in_progress", "backlog"],
  in_progress: ["needs_revision", "validated", "ready"],
  needs_revision: ["in_progress", "ai_drafting"],
  validated: ["done"],
  done: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal task transition: ${from} -> ${to}`);
  }
}

// ---- WIP limits -----------------------------------------------------------
// Core Kanban practice: cap the number of cards in a column so work-in-progress
// stays visible and bounded. A single default applies to every column; specific
// statuses can override. Keep EXTREMELY small — the point is to expose flow
// constraints, not to model real capacity.
export const DEFAULT_WIP = 5;

// Override only the columns that need a tighter cap. Anything absent falls back
// to DEFAULT_WIP.
export const WIP_LIMITS: Partial<Record<TaskStatus, number>> = {
  backlog: 8,
  in_progress: 4,
};

export function wipLimitFor(status: TaskStatus): number {
  return WIP_LIMITS[status] ?? DEFAULT_WIP;
}
