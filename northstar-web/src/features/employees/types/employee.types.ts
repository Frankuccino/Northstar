import z from "zod";
import { createEmployeeSchema } from "../schemas/employee.schema.js";

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
