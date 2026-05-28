import z from "zod";
import { createEmployeeSchema } from "../schemas/employee.schema.js";

export type CreateEmployeeDTO = z.infer<typeof createEmployeeSchema>;
// DTO means data transfer object
// It is a structured shape of data;
// used to move information between layers (API -> controller -> service -> DB)
