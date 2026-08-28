import { z } from "zod";

// Server-side registration validation (defect [D]). The controller currently
// trusts req.body with no checks, so a client can POST a weak or malformed
// password directly to the API. This is the authoritative gate — the frontend
// schema is a convenience, not a security boundary.
export const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().email().trim().max(254),
    // Passwords are secrets — do NOT trim. Require length + at least one letter
    // and one digit so trivial dictionary/short passwords are rejected.
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d).+$/,
        "Password must include a letter and a number",
      ),
    // confirmPassword must match password. It is validated here (server is the
    // authority) but stripped before the controller consumes the body.
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// The controller only needs name/email/password — drop the confirmation field
// so it never reaches user creation logic.
export type RegisterInput = z.infer<typeof registerSchema>;
export const toRegisterInput = (body: RegisterInput) => ({
  name: body.name,
  email: body.email,
  password: body.password,
});
