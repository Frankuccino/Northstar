# Kanban Board — Status & Gap Tracker

Live status of the Workspace Kanban board. Use this to see at a glance what is
implemented, what is missing, and what is intentionally deferred. Updated
2026-08-20.

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

## Missing (not yet implemented)

- **Task deletion** — DONE this session: `DELETE /workspace/tasks/:id` with a
  server-side `canDeleteTask(actor, projectId)` guard (admin/manager today;
  signature is future-proof for per-board ABAC). Frontend delete button in the
  task side-panel, role-gated (UX only — server returns 403 otherwise). See
  `docs/BOARD_ACCESS_MODEL.md` for the planned per-board ownership/ABAC model.

- **Filters / swimlanes** — no filtering by assignee, label, or type; no
  swimlanes.
- **Metrics** — no lead-time / cycle-time / throughput tracking.
- **Card ordering** — tasks within a column are unordered (no priority sort
  or manual reorder within a column).
- **Bulk / multi-select actions** — no way to move or act on several cards at once.
- **Assignee display on card** — DONE this session: `GET /workspace/:id/tasks`
  LEFT JOINs `users` and returns `assigneeName` (null when unassigned); the
  board card renders an initials + name badge. Backend change only — no new
  endpoint. Note: there is still no UI to *set* an assignee (separate feature);
  the field is populated only when a task is created with `assigneeId`.

## Deferred by design (explicit scope, per docs)

- **Real-time multi-user sync** — deferred to Ep14 (async + websockets). The
  board does not push updates to other clients yet; state is correct on refresh.
- **Metrics / cumulative flow diagrams** — process-level, out of current scope.
- **Feedback loops (standups/reviews)** — process-level, not a board concern.

## Functional vs. method-faithful assessment

- Functional Kanban UI (what a user touches): ~90% good. Missing ~10% = filters
  and card ordering; WIP limits now implemented.
- Method-faithful Kanban (WIP + pull + metrics + real-time): ~60%. About half
  of that gap (real-time, metrics) is intentionally deferred (Ep14).

## Recommended next steps (priority order)

1. **[C] Rate limiting** — the audit defect (login/refresh + workspace write
   paths); scaffold exists (`rate-limit.middleware.ts`, `SKIP_RATE_LIMIT=true`
   for tests) and needs wiring. See `next-steps.md`.
2. **Filters / swimlanes** — filter the board by assignee or type; cheap win
   for usability now that WIP makes column load visible.
3. **Assignee assignment UI** — set `assigneeId` from the task panel (the card
   now *displays* it; there is no way to *choose* an assignee yet).

## Related docs
- `WORKSPACE_AI_KANBAN.md` — domain model, AI trust gate, invariants.
- `FRONTEND_IA_AND_UI.md` — page architecture; notes auth defects [C][F][G][H].
- `REFRESH_TOKEN_AUTH.md` — auth defects [A]–[H] tracking.
- `next-steps.md` — backend hardening + rate-limit scaffold.
