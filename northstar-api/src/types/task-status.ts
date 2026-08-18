// Task lifecycle states. The board columns map 1:1 to these (see FRONTEND_IA_AND_UI.md).
// Transitions are enforced server-side in services/workspace/state-machine.ts —
// the client can never move a card into an illegal state.
export type TaskStatus =
  | "backlog"
  | "ai_drafting"
  | "ready"
  | "in_progress"
  | "needs_revision"
  | "validated"
  | "done";

export const TASK_STATUSES = [
  "backlog",
  "ai_drafting",
  "ready",
  "in_progress",
  "needs_revision",
  "validated",
  "done",
] as const satisfies readonly TaskStatus[];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}
