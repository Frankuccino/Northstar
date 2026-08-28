import { api } from "@/lib/axios";

import type {
  LoginPayload,
  AuthResponse,
  RegisterPayload,
} from "../types/auth";

export const login = async (data: LoginPayload): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", data);

  return response.data;
};

export const register = async (data: RegisterPayload) => {
  // confirmPassword is frontend-only validation; the API does not accept it.
  const { confirmPassword: _confirm, ...payload } = data;
  const response = await api.post("/auth/register", payload);

  return response.data;
};

// Revokes the server-side refresh token (httpOnly cookie). The browser drops the
// cookie via the Set-Cookie clear in the response; we also clear the access token
// from localStorage in the caller.
export const logout = async (): Promise<void> => {
  await api.post("/auth/logout");
};
