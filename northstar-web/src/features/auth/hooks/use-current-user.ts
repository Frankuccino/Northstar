import { useState, useEffect, useCallback } from "react";
import { jwtDecode, type JwtPayload } from "jwt-decode";

import { getToken, TOKEN_KEY } from "../utils/token";
import { isRole, type Role } from "@/types/role";

type CurrentUser = {
  id: string | number;
  email: string;
  role: Role;
};

// Single source of truth for "who is logged in" on the client.
// Decodes the access token; returns null when absent or undecodable.
// Uses useState + useEffect (not useMemo) so the hook re-evaluates
// whenever the token in localStorage changes (login/logout).
export const useCurrentUser = (): CurrentUser | null => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const readToken = useCallback(() => {
    const token = getToken();
    if (!token) {
      setCurrentUser(null);
      return;
    }

    try {
      const payload = jwtDecode<JwtPayload & { id?: unknown; role?: unknown; email?: unknown }>(token);
      if (payload.id == null) {
        setCurrentUser(null);
        return;
      }

      const role: Role = isRole(payload.role) ? payload.role : "employee";
      setCurrentUser({
        id: typeof payload.id === "number" ? payload.id : Number(payload.id),
        email: typeof payload.email === "string" ? payload.email : "",
        role,
      });
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    readToken();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        readToken();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [readToken]);

  return currentUser;
};
