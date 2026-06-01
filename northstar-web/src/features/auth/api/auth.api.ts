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
  const response = await api.post("/auth/register", data);

  return response.data;
};
