// Register Controller | Login Controller | Refresh/Logout/Me Controllers
import { login, register, getMe } from "../services/auth.service.js";
import {
  rotateRefreshToken,
  revokeRefreshToken,
  getValidRefreshToken,
  revokeAllForUser,
} from "../services/refresh-tokens.service.js";
import { signAccessToken } from "../lib/tokens.js";
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
  clearRefreshCookieOptions,
} from "../lib/cookies.js";
import { Request, Response } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const registerController = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const user = await register(email, password, name);

    const { password: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: "An unknown error occured" });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await login(email, password);

    // Refresh token travels ONLY via httpOnly cookie; access token in body
    // keeps the current frontend working until it migrates to in-memory storage.
    res.cookie(
      REFRESH_COOKIE,
      result.refreshToken,
      refreshCookieOptions(),
    );

    return res.json({
      user: result.user,
      token: result.accessToken,
      accessToken: result.accessToken,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: "An unknown error occured" });
  }
};

export const refreshController = async (req: Request, res: Response) => {
  try {
    const oldToken = req.cookies?.[REFRESH_COOKIE];
    if (!oldToken) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const stored = await getValidRefreshToken(oldToken);
    if (!stored) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Rotate: invalidate the old token, issue a new one (replay-safe).
    const { raw: newToken, expiresAt } = await rotateRefreshToken(
      oldToken,
      stored.userId,
    );
    res.cookie(REFRESH_COOKIE, newToken, refreshCookieOptions());

    const [u] = await db
      .select({ email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, stored.userId));
    const accessToken = signAccessToken({
      id: stored.userId,
      email: u?.email ?? "",
      role: u?.role ?? "employee",
    });

    return res.json({ accessToken, expiresAt });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

export const logoutController = async (req: Request, res: Response) => {
  const oldToken = req.cookies?.[REFRESH_COOKIE];
  if (oldToken) {
    await revokeRefreshToken(oldToken);
  }
  res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions());
  return res.json({ message: "Logged out" });
};

export const meController = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Re-fetch live user so role/email changes propagate immediately.
  const fresh = await getMe(Number(user.id));
  return res.json(fresh);
};
