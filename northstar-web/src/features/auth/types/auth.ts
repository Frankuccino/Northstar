import type { Role } from "@/types/role";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}
