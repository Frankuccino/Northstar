// This should own the following:
// - base URL
// - auth headers
// - interceptors
// - refresh handling

import axios from "axios";
import { env } from "./env";

export const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
