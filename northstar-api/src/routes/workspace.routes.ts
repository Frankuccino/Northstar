import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createProjectSchema,
  createTaskSchema,
  moveTaskSchema,
  assignTaskSchema,
  generateSuggestionSchema,
  validateSuggestionSchema,
  approveCommitSchema,
  createInvitationSchema,
  listInvitationsQuerySchema,
} from "../schemas/workspace.schema.js";
import {
  createProjectHandler,
  listProjectsHandler,
  getProjectHandler,
  createTaskHandler,
  listTasksHandler,
  moveTaskHandler,
  assignTaskHandler,
  generateSuggestionHandler,
  listSuggestionsHandler,
  validateSuggestionHandler,
  markValidatedHandler,
  approveCommitHandler,
  deleteTaskHandler,
  getAssignableUsersHandler,
  createInvitationHandler,
  listProjectInvitationsHandler,
  acceptInvitationHandler,
  revokeInvitationHandler,
} from "../controllers/workspace.controller.js";

const router = Router();

// All workspace routes require an authenticated user.
router.use(authenticate);

// Projects: list is open to any authed user; create is admin/manager.
router.get("/", listProjectsHandler);
router.post(
  "/",
  authorize("admin", "manager"),
  validate(createProjectSchema),
  createProjectHandler,
);

// Auth users available for assignment. Returns { id, name }[] for the assignee
// picker. Today returns all authenticated users — filtering to project members
// lands with the [Y] model without changing the frontend call site.
router.get("/users", getAssignableUsersHandler);

router.get("/:id", getProjectHandler);

// Tasks: any authed user can view; create is admin/manager.
router.get("/:id/tasks", listTasksHandler);
router.post(
  "/:id/tasks",
  authorize("admin", "manager"),
  validate(createTaskSchema),
  createTaskHandler,
);

// Card move is server-authoritative (state machine in the service layer).
router.patch(
  "/tasks/:id/move",
  validate(moveTaskSchema),
  moveTaskHandler,
);

// Reassign a card's assignee. Today any authenticated user may reassign to any
// user (the unconstrained v1) — the per-board invite constraint lands with the
// [Y] model. Task not found → 404; the body is validated by assignTaskSchema
// (assigneeId may be null to clear the assignee).
router.patch(
  "/tasks/:id/assign",
  validate(assignTaskSchema),
  assignTaskHandler,
);

// AI suggestions: generation is admin/manager; listing is any authed user.
router.get("/tasks/:id/suggestions", listSuggestionsHandler);
router.post(
  "/tasks/:id/suggestions",
  authorize("admin", "manager"),
  validate(generateSuggestionSchema),
  generateSuggestionHandler,
);

// Human validation + commit approval — the trust gate. Any authed user acts.
router.post(
  "/tasks/:id/validate",
  validate(validateSuggestionSchema),
  validateSuggestionHandler,
);
router.patch(
  "/tasks/:id/validate-task",
  markValidatedHandler,
);
router.post(
  "/tasks/:id/commit",
  validate(approveCommitSchema),
  approveCommitHandler,
);

// Delete is gated server-side by canDeleteTask (admin/manager today; per-board
// ABAC later). The route is authenticated; authority is never client-supplied.
router.delete("/tasks/:id", deleteTaskHandler);

// Invitations: create + list are admin/manager; accept is token-gated (public);
// revoke is admin/manager only.
router.post(
  "/projects/:id/invitations",
  authorize("admin", "manager"),
  validate(createInvitationSchema),
  createInvitationHandler,
);
router.get(
  "/projects/:id/invitations",
  authorize("admin", "manager"),
  listProjectInvitationsHandler,
);
router.delete(
  "/projects/:id/invitations/:invitationId",
  authorize("admin", "manager"),
  revokeInvitationHandler,
);
router.post(
  "/invitations/accept",
  authenticate,
  acceptInvitationHandler,
);

export default router;
