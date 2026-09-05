# Kanban Board — Status & Gap Tracker

Live status of the Workspace Kanban board. Use this to see at a glance what is
implemented, what is missing, and what is intentionally deferred. Updated
2026-09-02.

Scope note: this board is a *functional, server-authoritative Kanban with an
AI trust gate* — not full Lean-Kanban. Gaps that are deferred by design (see
below) are explicit scope decisions, not shortfalls.

## Implemented (done)

### Core Kanban practices
- **Visualize workflow** — 7 columns mapped 1:1 to the task state machine
  (`backlog → ai_drafting → ready → in_progress → needs_revision → validated → done`).
- **Manage flow** — drag-and-drop via @dnd-kit; card moves call `moveTask`,
  which is enforced by the server (state machine in `workspace/state-machine.ts`).
- **Make policies explicit** — the state machine IS the policy, enforced
  server-side. Frontend mirrors it (`legalNextStatuses` in
  `features/workspace/types/workspace.ts`) to grey out + disable illegal
  drop-target columns during a drag.

### Board UI essentials
- **Drag between columns** with illegal-drop guardrails (greyed + disabled
  columns; `pointerWithin` collision detection so a disabled column can't
  fall back to a neighbouring one).
- **Card detail side panel** (Sheet slide-over) with:
  - AI suggestions (versioned, stubbed provider), accept / reject / edit
  - `reason` required on reject (human-in-the-loop audit, enforced server-side)
  - "Mark validated" shortcut (walks legal transitions to `validated`)
  - Approve & commit (requires `message` + `justification`, audit record written)
  - Consistent fixed-height suggestions area (`h-[55vh]`) so lower controls
    align across all cards.
- **WIP limits** — per-column caps (`WIP_LIMITS` + `DEFAULT_WIP` in
  `services/workspace/state-machine.ts`), enforced server-side in `createTask`
  (backlog) and `moveTask` (destination, excluding the card itself). Violations
  return HTTP 400 (`WIP limit reached for <status> (cap N)`). The board shows a
  `n/cap` badge per column and greys + disables columns at/over cap, consistent
  with the transition guardrail. Config lives in one place on both sides
  (backend `state-machine.ts` ↔ frontend `types/workspace.ts` mirror).
- **Assignee display + picker** — `GET /workspace/:id/tasks` LEFT JOINs `users`
  and returns `assigneeName`; task-detail panel has an assignee `<Select>`
  listing assignable users. Backend `PATCH /tasks/:id/assign` updates assignee
  and invalidates board query on success. Tests cover reassign, clear, and
  nonexistent task → 404.
- **Board filters** — status + assignee filter bar wired through
  `GET /workspace/:id/tasks?status=&assigneeId=`; service applies optional
  filters including nullable assignee via `IS NULL`.

## In progress / designed

- **Formal invitations** — design doc created at `docs/WORKSPACE_INVITATIONS.md`.
  Planned: invite by email → tokenized accept link → project membership.
  Supersedes current “all users” assignee picker; not yet implemented.
- **Hybrid AI integration** — design doc created at `docs/WORKSPACE_AI_INTEGRATION.md`.
  Planned: shared AI API layer for task CRUD/moves, consumed by in-app chat and
  external AI clients. Depends on formal invitations for safe assignee actions.
  Not yet implemented.

## Missing (not yet implemented)

- **Task deletion UI wiring** — backend `DELETE /workspace/tasks/:id` exists with
  server-side `canDeleteTask(actor, projectId)`; task panel delete button still
  needs review/final wiring.
- **Filters / swimlanes** — board filtering implemented; swimlanes not started.
- **Metrics** — no lead-time / cycle-time / throughput tracking.
- **Card ordering** — tasks within a column are unordered (no priority sort
  or manual reorder within a column).
- **Bulk / multi-select actions** — no way to move or act on several cards at once.

## Deferred by design (explicit scope, per docs)

- **Real-time multi-user sync** — deferred to Ep14 (async + websockets). The
  board does not push updates to other clients yet; state is correct on refresh.
- **Metrics / cumulative flow diagrams** — process-level, out of current scope.
- **Feedback loops (standups/reviews)** — process-level, not a board concern.

## Functional vs. method-faithful assessment

- Functional Kanban UI (what a user touches): ~90% good. Missing ~10% = card
  ordering, swimlanes, bulk actions; WIP limits implemented.
- Method-faithful Kanban (WIP + pull + metrics + real-time): ~60%. About half
  of that gap (real-time, metrics) is intentionally deferred (Ep14).

## Recommended next steps (priority order)

1. **Formal invitations** — implement `docs/WORKSPACE_INVITATIONS.md`; required
   before AI can safely assign unknown users.
2. **Hybrid AI integration** — implement `docs/WORKSPACE_AI_INTEGRATION.md`
   after invitations; starts with AI API layer, then in-app chat.
3. **Card ordering** — drag-to-reorder within a column via `position` field.

## Related docs
- `WORKSPACE_AI_KANBAN.md` — domain model, AI trust gate, invariants.
- `WORKSPACE_INVITATIONS.md` — formal invite flow design.
- `WORKSPACE_AI_INTEGRATION.md` — hybrid AI API + in-app chat design.
- `FRONTEND_IA_AND_UI.md` — page architecture; notes auth defects [C][F][G][H].
- `REFRESH_TOKEN_AUTH.md` — auth defects [A]–[H] tracking.
- `next-steps.md` — backend hardening + rate-limit scaffold.
- `next-steps.md` — backend hardening + rate-limit scaffold.
