// employee route

import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

import {
  createEmployee,
  getEmployees,
} from "../controllers/employee.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { createEmployeeSchema } from "../schemas/employee.schema.js";

const router = Router();

router.get("/", authenticate, authorize("admin"), getEmployees);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validate(createEmployeeSchema),
  createEmployee,
);

export default router;

// we need to now implement testing to make it easier to test without the manual testing
