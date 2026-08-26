import type { Role } from "../../types/role.js";

// Board-scoped authorization (defect [Y] foundation, used by Option X deletion).
//
// The signature `(actor, projectId)` is intentionally future-proof: when the
// per-board ABAC model lands (owner + board_members), ONLY the body of
// canDeleteTask changes (a board_members lookup) — the route, controller, and
// frontend call site stay identical. No migration of the delete path.
//
// Today the policy is the app-global role (admin | manager). That is a TEMPORARY
// implementation behind a stable question: "may this actor delete on this
// board?" See docs/BOARD_ACCESS_MODEL.md.

export interface Actor {
  id: number;
  role: Role;
}

export async function canDeleteTask(
  actor: Actor,
  _projectId: number,
): Promise<boolean> {
  // Placeholder for the future board_members lookup. The projectId parameter is
  // already threaded through so Y can use it without changing call sites.
  return actor.role === "admin" || actor.role === "manager";
}
