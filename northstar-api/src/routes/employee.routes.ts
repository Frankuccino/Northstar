// employee route

import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from "../controllers/employee.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../schemas/employee.schema.js";

const router = Router();

router.get("/", authenticate, authorize("admin"), getEmployees);
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validate(createEmployeeSchema),
  createEmployee,
);
router.get("/:id", authenticate, authorize("admin"), getEmployeeById);
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validate(updateEmployeeSchema),
  updateEmployee,
);
router.delete("/:id", authenticate, authorize("admin"), deleteEmployee);

export default router;

// we need to now implement testing to make it easier to test without the manual testing
