import { Router } from "express";
import { aiAuthenticate } from "../middleware/ai.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  executeAiIntentHandler,
  listAiActionsHandler,
} from "../controllers/workspace.controller.js";
import { executeAiIntentSchema, listAiActionsQuerySchema } from "../schemas/workspace.schema.js";

const router = Router();

router.use(aiAuthenticate);

router.post(
  "/projects/:id/execute",
  validate(executeAiIntentSchema),
  executeAiIntentHandler,
);
router.get(
  "/projects/:id/actions",
  validate(listAiActionsQuerySchema),
  listAiActionsHandler,
);

export default router;
