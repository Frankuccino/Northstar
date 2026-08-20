import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createProjectSchema,
  createTaskSchema,
  moveTaskSchema,
  generateSuggestionSchema,
  validateSuggestionSchema,
  approveCommitSchema,
} from "../schemas/workspace.schema.js";
import {
  createProjectHandler,
  listProjectsHandler,
  getProjectHandler,
  createTaskHandler,
  listTasksHandler,
  moveTaskHandler,
  generateSuggestionHandler,
  listSuggestionsHandler,
  validateSuggestionHandler,
  markValidatedHandler,
  approveCommitHandler,
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

export default router;
