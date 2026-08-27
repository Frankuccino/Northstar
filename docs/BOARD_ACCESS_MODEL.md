# Board Access Model (Per-Board Ownership + ABAC)

_Status: DESIGN ONLY. Not yet implemented. This document is the retained spec for
defect/feature [Y] — the per-board access-control layer that supersedes the
current app-global role gate for workspace actions._

_Last updated: current session (Option X deletion shipped first; this is the
future model it must remain compatible with)._

## The problem with the current model

Today, workspace actions are gated by the **app-global role**
(`admin | manager | employee`) via `authorize(...)` in
`src/middleware/role.middleware.ts`. That answers "is this user an admin?" —
not "is this user allowed to act on *this specific board*?"

For a real multi-user Kanban that is insufficient:
- A user who *created* a board should own it, regardless of their global role.
- The owner should invite others and grant them board-scoped roles/permissions.
- An employee who owns board A must be able to delete on A even though they are
  not a global admin. Conversely, a global manager who is *not* a member of
  board B must not act on B.

## Two distinct authorization layers

| Layer | Scope | Mechanism today | Future |
|-------|-------|-----------------|--------|
| **App RBAC** | whole app | `authorize("admin","manager")` (global role) | unchanged |
| **Board ABAC** | one board | — (does not exist) | `requireBoardPermission(action)` middleware + `board_members` lookup |

These are separate concerns. The existing `authorize()` middleware must stay for
app-level concerns (e.g. who can create a project at all). A NEW middleware,
`requireBoardPermission(action)`, is needed for board-scoped actions. It loads
the board's membership and resolves the action against the caller's
board-level role/permissions. Do NOT fold board logic into `authorize()`.

## Target model (as described)

- **Owner**: the user who creates a board. Full administrative control over that
  board (delete, edit, manage members, transfer ownership).
- **Invitations**: the owner invites registered users and assigns each a
  board-level role or an explicit action set.
- **Board-level roles (RBAC option)**: `Owner` (creator / assigned) · `Editor`
  (can create/edit/move/delete tasks) · `Viewer` (read-only). Roles imply a
  fixed action set — simpler, standard.
- **Action-based (ABAC option)**: owner assigns a per-user set of actions
  (`can_view`, `can_edit`, `can_delete`, `can_manage_members`). More flexible,
  more UI. Pick ONE paradigm; RBAC is recommended for v1, ABAC can layer later.
- **UI indicators**: the projects list must show whether the current user is
  the **owner** of each board, and their **board role** when they were invited.

## Migration-free path for deletion (IMPORTANT)

Option X ships `DELETE /workspace/tasks/:id` NOW, before this model exists. To
avoid a future rework/migration of the delete path:

- Deletion is routed through a single helper:
  `canDeleteTask(actor: {id, role}, projectId: number): Promise<boolean>`.
- Its signature ALREADY takes `(actor, projectId)` — matching the future ABAC
  question. Today its body does the global-role check
  (`actor.role === "admin" || actor.role === "manager"`).
- When this model lands, ONLY the *body* of `canDeleteTask` changes (look up
  `board_members` for `projectId` and resolve `can_delete`). The route,
  controller, and frontend call site stay identical. **No migration of the
  delete logic, no refactor of call sites.**
- This is the same isolation pattern used for `isRole` and `wipLimitFor`: the
  caller asks the right question; the policy body is swappable.

## Proposed future schema (for Y — not created yet)

```sql
-- ownership on the board itself
ALTER TABLE projects ADD COLUMN owner_id integer
  REFERENCES users(id) ON DELETE CASCADE NOT NULL;

-- per-board membership + role/permissions
CREATE TABLE board_members (
  id        serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text NOT NULL,  -- 'owner' | 'editor' | 'viewer' (RBAC v1)
  -- ABAC extension (optional later): can_view/can_edit/can_delete/booleans
  created_at timestamp DEFAULT now() NOT NULL,
  UNIQUE (project_id, user_id)
);

-- backfill: existing projects' creator becomes owner (data migration)
```

## Open questions for Y (resolve before building)

1. Owner-only full-admin, or owner-assignable "board admins" beneath owner?
2. RBAC (roles) vs ABAC (action checkboxes) for v1? (Recommend RBAC.)
3. Invitation by email lookup of existing users, or open invite links?
4. On ownership transfer, what happens to the old owner's `board_members` row?
5. Does `projectId` in the URL (not body) stay the source of truth for which
   board an action targets? (Yes — same confused-deputy guard as [F].)

## Compatibility checklist

- [x] Deletion uses `canDeleteTask(actor, projectId)` (future-proof signature).
- [ ] `projects.owner_id` added + backfilled.
- [ ] `board_members` table created.
- [ ] `requireBoardPermission(action)` middleware added (separate from
      `authorize`).
- [ ] Projects list shows owner badge + viewer's board role.
- [ ] Invite/manage-members UI.
