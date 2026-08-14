# Frontend — Page IA + UI Quality Plan

_Status: Proposed / pre-implementation. Auth role union [B] lands first._
_Last updated: current session_

## Stack note (resolve confusion)
- We use **shadcn/ui (CLI) with Base UI as the headless primitive layer** — NOT Radix.
- This is consistent and fine. No mixed-primitive problem. Lock this in: shadcn generator targets Base UI; do not introduce Radix packages.
- Existing `components/ui`: button, input, label. Build the rest under `components/ui` (see UI primitives below).

## Current frontend state (as of this session)
- Pages: Login, Register (auth feature), Dashboard + Dashboard layout, Employee CRUD (dashboard feature), Auth layout, Protected/Public routes.
- Gaps (from next-steps.md Gap 7, still Pending): no loading skeleton, no empty state, inconsistent layouts, no global app shell/nav.
- "Bad UI" is mostly: no design tokens, no loading/empty/error states, ad-hoc spacing — NOT a page-structure problem.

## Page architecture (tiered)

### MUST-HAVE (MVP, build in this order)
1. **Login / Register** — exist; polish only. No new IA.
2. **App Shell** (authenticated layout) — sidebar nav + topbar with user menu (logout). Missing as a coherent global shell; currently only dashboard-layout.
3. **Dashboard / Home** — overview: active tasks, AI suggestions awaiting validation, recent activity. Replaces the current bare dashboard.
4. **Projects list** — index of workspaces/projects.
5. **Project detail** — board container + metadata + member list.
6. **Board (Kanban)** — THE centerpiece. Columns = `Task.status` (backlog → ready → in_progress → needs_revision → validated → done). Cards show title + AI-suggestion badge. REST-backed now; WebSocket later.
7. **Task detail** — description, versioned AI suggestions, validation actions (accept/reject/edit + reason), commit-guidance preview, audit trail of validations.

### SHOULD-HAVE (after MVP — supports "who's active")
8. **Activity / Audit view** — per-user validation history, streaks, scores. The "is the user active/inactive" surface from the original idea.
9. **Settings / Profile** — display name, (read-only) role. No LLM key UI (server-side env only).

### LATER / DEFERRED
10. **Admin** (user + role management) — needs role union [B] first.
11. **Real-time presence/collab overlays** — thin layer over the Board model. Deferred (costliest, lowest learning value).

## UI quality layer (do alongside, not after)
- One `components/ui` source of truth: extend with `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`, `Badge`, `Card`, `Dialog` (already via Base UI), `Toast`.
- Enforce in Board + Task detail FIRST (highest traffic, most states).
- This is next-steps.md Gap 7 (Error UX / Polish). Promote to a small `src/lib/toast.tsx` before adding a UI library (per existing note).

## Build order (depends on auth)
1. Finish auth role union **[B]** (board needs roles: who can draft vs validate).
2. Model Workspace backend (Task state machine, AiSuggestion, TaskValidation, CommitRecord) — see `docs/WORKSPACE_AI_KANBAN.md`.
3. Frontend: **App Shell + Dashboard** (nav, logout, overview) with UI primitives.
4. Frontend: **Projects list → Project detail → Board**.
5. Frontend: **Task detail** (suggestions + validation + audit).
6. Frontend: **Activity / Audit view**.
7. (Later) WebSocket live overlays; (later) Admin; (later) real LLM key via env.

## Per-page acceptance (sketch)
- App Shell: nav reflects role (admin sees Admin link); logout clears in-memory token + calls `/auth/logout`; responsive sidebar collapse.
- Board: loading skeleton while fetching; empty state when no tasks; card move = POST status transition (server state machine is authority); AI-suggestion badge visible.
- Task detail: shows versioned suggestions; validation form requires reason on reject/edit; audit trail read-only, append-only.

## Relation to other docs
- `docs/WORKSPACE_AI_KANBAN.md` — domain model + pipeline this IA renders.
- `docs/REFRESH_TOKEN_AUTH.md` — auth foundation; frontend migration (in-memory access token + refresh interceptor) lands here and feeds App Shell logout.
- Auth defects [C][F][G][H] still apply to the board's write paths (rate limit, server validation, logger, error middleware).

## Open architectural question
Board columns map 1:1 to `Task.status`, so "move card" = state-machine transition. With later WebSocket live-sync, where does transition authority live (client optimistic vs server state machine), and what invariant must the server enforce so two users dragging the same card can't both "validate" it?
