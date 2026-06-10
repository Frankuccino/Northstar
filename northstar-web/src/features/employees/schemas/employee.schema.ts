import { z } from "zod";

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  position: z.string().min(1),
  department: z.string().min(1),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();
