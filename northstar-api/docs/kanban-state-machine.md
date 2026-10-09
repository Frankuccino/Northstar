# Kanban State Machine

> Status: Implemented
> Date: 2026-10-09
> File: `src/services/workspace/state-machine.ts`
> Related: `ai-pattern-1-tool-calling-implementation.md`, `ai-agent-activity-streaming.md`

---

## What It Is

A server-authoritative state machine that defines which task status transitions are legal, and caps how many cards each column can hold (WIP limits).

The board UI calls `moveTask`; this module is the **only** place transitions are defined. An illegal move is rejected here regardless of what the client sends — the server, not the UI, owns card legitimacy.

## Legal Transitions

```
backlog        → ai_drafting, in_progress
ai_drafting    → ready, backlog
ready          → in_progress, backlog
in_progress    → needs_revision, validated, ready
needs_revision → in_progress, ai_drafting
validated      → done
done           → (terminal — no outgoing transitions)
```

**Why `backlog → ready` is illegal:** The workflow requires tasks to pass through `ai_drafting` before reaching `ready`. This enforces a review step — a task can't skip from "not started" to "ready for review" without being drafted first.

**Why `done` is terminal:** Completed tasks are immutable. To change a task after it's done, it must first be moved back to an earlier column (which is also illegal — `done` has no outgoing transitions).

## WIP Limits

| Column | Cap |
|---|---|
| backlog | 8 |
| in_progress | 4 |
| ai_drafting | 5 (default) |
| ready | 5 (default) |
| needs_revision | 5 (default) |
| validated | 5 (default) |
| done | 5 (default) |

**Why WIP limits exist:** Core Kanban practice — cap the number of cards in a column so work-in-progress stays visible and bounded. The caps are intentionally small to expose flow constraints, not to model real capacity.

**How the cap is enforced:** `countTasksInColumn(projectId, status)` counts existing cards. If `count >= limit`, the operation throws. The card being moved is excluded from the count so moving within (or back into) a column it already occupies doesn't count against itself.

## API

```ts
canTransition(from: TaskStatus, to: TaskStatus): boolean
assertTransition(from: TaskStatus, to: TaskStatus): void  // throws if illegal
wipLimitFor(status: TaskStatus): number
```

## How the AI Uses It

The AI's `move_task` and `create_task` tools call `moveTask` and `createTask` in the service layer, which call `assertTransition` and `wipLimitFor`. When a transition is illegal or a column is full, the service throws, and `executeToolCall` catches it and returns a structured error envelope:

```json
{
  "ok": false,
  "tool": "move_task",
  "summary": "Illegal task transition: backlog -> ready",
  "error": { "code": "MOVE_FAILED", "message": "Illegal task transition: backlog -> ready" }
}
```

The LLM receives this as a tool result and can explain the rejection to the user in plain language, rather than the request failing with a 500.

## Why This Matters for AI Safety

The state machine is the first line of defense against the AI doing something destructive. It makes the AI's tools **untrusted input** — the same treatment as a malformed HTTP request. The AI cannot talk its way past these guards.

This is the complement to Pattern 4 (Risk-Gated Confirmation):
- **State machine** rejects *invalid* moves (illegal transitions, WIP violations)
- **Pattern 4** would reject *destructive but valid* moves (e.g. delete) without explicit user confirmation

## Testing

The state machine is tested indirectly through the AI chat integration tests. The `move_task` tool's `INVALID_STATUS` error path is covered by `tests/ai-chat.test.ts`.

Direct unit tests for `canTransition` and `wipLimitFor` would be a good addition — they're pure functions with no dependencies.
