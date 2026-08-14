import { useMemo } from "react";
import { jwtDecode, type JwtPayload } from "jwt-decode";

import { getToken } from "../utils/token";

type CurrentUser = {
  id: string | number;
  email: string;
  role: string;
};

// Single source of truth for "who is logged in" on the client.
// Decodes the access token; returns null when absent or undecodable.
export const useCurrentUser = (): CurrentUser | null => {
  return useMemo(() => {
    const token = getToken();
    if (!token) return null;

    try {
      const payload = jwtDecode<JwtPayload & CurrentUser>(token);
      if (!payload.sub) return null;
      return {
        id: payload.sub,
        email: payload.email ?? "",
        role: payload.role ?? "employee",
      };
    } catch {
      return null;
    }
  }, []);
};
