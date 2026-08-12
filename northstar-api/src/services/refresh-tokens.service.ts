import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { refreshTokens } from "../db/schema.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from "../lib/tokens.js";

// Hand a client a new refresh token and persist its hash server-side.
export const issueRefreshToken = async (
  userId: number,
): Promise<{ raw: string; expiresAt: Date }> => {
  const { raw, hash, expiresAt } = generateRefreshToken();
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hash,
    expiresAt,
    revoked: 0,
  });
  return { raw, expiresAt };
};

export const getValidRefreshToken = async (raw: string) => {
  const hash = hashRefreshToken(raw);
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(eq(refreshTokens.tokenHash, hash), eq(refreshTokens.revoked, 0)),
    );
  if (!row) return undefined;
  if (row.expiresAt.getTime() < Date.now()) return undefined;
  return row;
};

// Rotation: revoke the consumed token and issue a fresh one. Limits replay of
// a stolen refresh token to a single use.
export const rotateRefreshToken = async (
  oldRaw: string,
  userId: number,
): Promise<{ raw: string; expiresAt: Date }> => {
  const oldHash = hashRefreshToken(oldRaw);
  await db
    .update(refreshTokens)
    .set({ revoked: 1 })
    .where(eq(refreshTokens.tokenHash, oldHash));
  return issueRefreshToken(userId);
};

export const revokeRefreshToken = async (raw: string): Promise<void> => {
  const hash = hashRefreshToken(raw);
  await db
    .update(refreshTokens)
    .set({ revoked: 1 })
    .where(eq(refreshTokens.tokenHash, hash));
};

// "Logout from all devices": invalidates every refresh token for the user.
export const revokeAllForUser = async (userId: number): Promise<void> => {
  await db
    .update(refreshTokens)
    .set({ revoked: 1 })
    .where(eq(refreshTokens.userId, userId));
};

export const REFRESH_MAX_AGE_MS = REFRESH_TOKEN_TTL_MS;
