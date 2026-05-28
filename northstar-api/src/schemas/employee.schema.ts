import { z } from "zod";
// Zod is used for API safety, the one we have in the ../db/schema/employees.ts is for the database truth
//

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  position: z.string().min(1),
  department: z.string().min(1),
});
