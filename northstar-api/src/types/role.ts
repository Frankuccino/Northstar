// Single source of truth for the user role vocabulary.
// Enforced at the type level (everywhere), at the DB level (check constraint in
// db/schema/users.ts), and at runtime (isRole guard in the auth middleware).
export type Role = "admin" | "manager" | "employee";

export const ROLES = ["admin", "manager", "employee"] as const satisfies readonly Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
