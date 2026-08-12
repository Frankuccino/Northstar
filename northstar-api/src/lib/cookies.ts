import type { CookieOptions } from "express";
import { REFRESH_TOKEN_TTL_MS } from "./tokens.js";

export const REFRESH_COOKIE = "northstar_refresh";

// `secure` is dropped in development (plain HTTP) so local testing can receive
// the cookie; production (NODE_ENV=production) forces secure transport.
export const refreshCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/auth",
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
};

export const clearRefreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/auth",
});
