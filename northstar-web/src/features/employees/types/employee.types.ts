import z from "zod";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../schemas/employee.schema.js";

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
