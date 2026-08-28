import { z } from "zod";

// Frontend convenience validation (the server is the authority — see the
// backend registerSchema). Mirrors the backend rules so the user gets instant
// feedback, but the API still enforces everything.
export const registerSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
