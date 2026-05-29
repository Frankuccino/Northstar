export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  accessToken: string;
  user: User;
}
