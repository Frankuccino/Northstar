import crypto from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthPayload } from "../types/express.js";
import { isRole, type Role } from "../types/role.js";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 7;

const ISSUER = "northstar-api";
const AUDIENCE = "northstar-web";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Server configuration error: JWT_SECRET missing.");
  return secret;
};

export const signAccessToken = (payload: {
  id: number;
  email: string;
  role: Role;
}): string => {
  return jwt.sign(
    { id: payload.id, email: payload.email, role: payload.role },
    getSecret(),
    { expiresIn: ACCESS_TOKEN_TTL, issuer: ISSUER, audience: AUDIENCE },
  );
};

export const verifyAccessToken = (token: string): AuthPayload => {
  const decoded = jwt.verify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  }) as JwtPayload & { id?: unknown; email?: unknown; role?: unknown };

  // The role claim is untrusted (a forged/legacy token could carry anything).
  // Coerce it through isRole and fall back to least-privilege "employee"
  // rather than trusting a raw cast — this is the single deserialization
  // point that feeds req.user.role everywhere.
  const role: Role = isRole(decoded.role) ? decoded.role : "employee";

  return {
    id: Number(decoded.sub ?? decoded.id),
    email: typeof decoded.email === "string" ? decoded.email : "",
    role,
  };
};

// Opaque, unguessable refresh token. Returns the raw value (goes to the
// cookie) plus its SHA-256 hash (goes to the DB — never store the raw value).
export const generateRefreshToken = (): {
  raw: string;
  hash: string;
  expiresAt: Date;
} => {
  const raw = crypto.randomBytes(48).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  return { raw, hash, expiresAt };
};

export const hashRefreshToken = (raw: string): string =>
  crypto.createHash("sha256").update(raw).digest("hex");

export const REFRESH_TOKEN_TTL_MS =
  REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
