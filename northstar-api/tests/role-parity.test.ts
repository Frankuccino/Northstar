import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Defect [B]: the Role union is mirrored on the frontend (a separate copy).
// These two must never drift — if someone adds a role to the backend, the
// frontend build won't catch it (separate package). This test fails loudly.
const here = dirname(fileURLToPath(import.meta.url));
const API_ROLE = resolve(here, "../src/types/role.ts");
const WEB_ROLE = resolve(
  here,
  "../../northstar-web/src/types/role.ts",
);

function extractRoles(path: string): string[] {
  const src = readFileSync(path, "utf8");
  const m = src.match(/ROLES\s*=\s*\[([^\]]+)\]/);
  if (!m) throw new Error(`Could not find ROLES in ${path}`);
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

describe("Role union parity (defect [B])", () => {
  it("backend and frontend ROLES arrays match exactly", () => {
    const apiRoles = extractRoles(API_ROLE);
    const webRoles = extractRoles(WEB_ROLE);
    expect(apiRoles).toEqual(webRoles);
  });
});
