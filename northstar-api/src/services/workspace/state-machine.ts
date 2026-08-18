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
