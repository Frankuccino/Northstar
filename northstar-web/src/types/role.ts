// Frontend mirror of the backend Role vocabulary (northstar-api/src/types/role.ts).
// Keep these two in sync — the sidebar gating (nav-items.ts) is type-checked
// against this union.
export type Role = "admin" | "manager" | "employee";

export const ROLES = ["admin", "manager", "employee"] as const satisfies readonly Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
