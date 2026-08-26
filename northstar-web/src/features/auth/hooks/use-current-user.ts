import { useMemo } from "react";
import { jwtDecode, type JwtPayload } from "jwt-decode";

import { getToken } from "../utils/token";
import { isRole, type Role } from "@/types/role";

type CurrentUser = {
  id: string | number;
  email: string;
  role: Role;
};

// Single source of truth for "who is logged in" on the client.
// Decodes the access token; returns null when absent or undecodable.
export const useCurrentUser = (): CurrentUser | null => {
  return useMemo(() => {
    const token = getToken();
    if (!token) return null;

    try {
      const payload = jwtDecode<JwtPayload & { role?: unknown; email?: unknown }>(token);
      if (!payload.sub) return null;
      // The role claim is untrusted (a forged/legacy token could carry a
      // non-Role string like "user"). Validate it; fall back to least-privilege
      // "employee" rather than trusting a raw `as Role` cast.
      const role: Role = isRole(payload.role) ? payload.role : "employee";
      return {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : "",
        role,
      };
    } catch {
      return null;
    }
  }, []);
};
