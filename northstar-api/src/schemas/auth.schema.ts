import { z } from "zod";

// Server-side registration validation (defect [D]). The controller currently
// trusts req.body with no checks, so a client can POST a weak or malformed
// password directly to the API. This is the authoritative gate — the frontend
// schema is a convenience, not a security boundary.
//
// Note: confirmPassword is intentionally NOT required here. The frontend
// RegisterPayload does not yet send it (the confirm-password field is still
// pending in RegisterForm); enforcing it now would break the existing UI.
// When that field lands, add `confirmPassword` + a superRefine equality check.
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().trim().max(254),
  // Passwords are secrets — do NOT trim. Require length + at least one letter
  // and one digit so trivial dictionary/short passwords are rejected.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must include a letter and a number"),
});
