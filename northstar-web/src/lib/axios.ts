// This should own the following:
// - base URL
// - auth headers
// - interceptors
// - refresh handling

import axios from "axios";
import { env } from "./env";
import { getToken } from "@/features/auth/utils/token";

export const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
