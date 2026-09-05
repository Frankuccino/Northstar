import { eq, and, lt, desc, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../db/index.js";
import {
  invitations,
  projectMembers,
  users,
  type InvitationStatus,
} from "../db/schema.js";
import type { Actor } from "./workspace/access.js";

const TOKEN_BYTES = 16;
const TTL_DAYS = 7;

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
    .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
  return { raw, hash: hashInviteToken(raw) };
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function hashInviteTokenAsync(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(raw);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createInvitation = async (
  actor: Actor,
  projectId: number,
  email: string,
) => {
  const normalized = email.trim().toLowerCase();
  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const [invitation] = await db
    .insert(invitations)
    .values({
      email: normalized,
      projectId,
      invitedById: actor.id,
      tokenHash: hash,
      status: "pending",
      expiresAt,
    })
    .returning();

  return { ...invitation, rawToken: raw };
};

export const getProjectInvitations = async (
  projectId: number,
  statuses?: InvitationStatus[],
) => {
  const whereClause = statuses?.length
    ? and(
        eq(invitations.projectId, projectId),
        inArray(invitations.status, statuses),
      )
    : eq(invitations.projectId, projectId);

  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      createdAt: invitations.createdAt,
      invitedById: invitations.invitedById,
      invitedByName: users.name,
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.invitedById, users.id))
    .where(whereClause)
    .orderBy(desc(invitations.createdAt));
};

export const acceptInvitation = async (rawToken: string, userId: number) => {
  const hash = await hashInviteTokenAsync(rawToken);

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.tokenHash, hash),
        eq(invitations.status, "pending"),
        lt(invitations.expiresAt, new Date()),
      ),
    );

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  await db
    .insert(projectMembers)
    .values({
      projectId: invitation.projectId,
      userId,
      role: "member",
    })
    .onConflictDoNothing()
    .returning();

  const [updated] = await db
    .update(invitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(eq(invitations.id, invitation.id))
    .returning();

  return updated;
};

export const revokeInvitation = async (
  actor: Actor,
  invitationId: number,
) => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId));

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Cannot revoke a non-pending invitation");
  }

  const [updated] = await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(eq(invitations.id, invitationId))
    .returning();

  return updated;
};
