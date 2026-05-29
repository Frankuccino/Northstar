import { api } from "@/lib/axios";

import type { LoginPayload, AuthResponse } from "../types/auth";

export const login = async (data: LoginPayload): Promise<AuthResponse> => {
  const response = await api.post("/auth/login", data);

  return response.data;
};
