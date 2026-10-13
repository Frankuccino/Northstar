import { randomUUID } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { aiPendingActions, type PendingActionStatus } from "../db/schema.js";

// How long a confirmation prompt stays valid. A prompt that never expires is a
// standing authorization to delete, so the gate closes itself.
export const PENDING_TTL_MS = 10 * 60 * 1000;

export interface PendingAction {
  id: string;
  projectId: number;
  actorUserId: number;
  actionName: string;
  args: Record<string, unknown>;
  summary: string;
  status: PendingActionStatus;
  createdAt: Date;
  expiresAt: Date;
  resolvedAt: Date | null;
}

function toDomain(row: typeof aiPendingActions.$inferSelect): PendingAction {
  return {
    id: row.id,
    projectId: row.projectId,
    actorUserId: row.actorUserId,
    actionName: row.actionName,
    args: JSON.parse(row.args),
    summary: row.summary,
    status: row.status,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    resolvedAt: row.resolvedAt,
  };
}

export async function createPendingAction(input: {
  projectId: number;
  actorUserId: number;
  actionName: string;
  args: Record<string, unknown>;
  summary: string;
}): Promise<PendingAction> {
  const [row] = await db
    .insert(aiPendingActions)
    .values({
      id: randomUUID(),
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      actionName: input.actionName,
      args: JSON.stringify(input.args),
      summary: input.summary,
      expiresAt: new Date(Date.now() + PENDING_TTL_MS),
    })
    .returning();
  return toDomain(row);
}

export async function getPendingAction(id: string): Promise<PendingAction | null> {
  const [row] = await db
    .select()
    .from(aiPendingActions)
    .where(eq(aiPendingActions.id, id))
    .limit(1);
  return row ? toDomain(row) : null;
}

// Mark resolved. Returns false if the row was already resolved, so two
// concurrent approvals can't both execute the action.
export async function resolvePendingAction(
  id: string,
  status: Extract<PendingActionStatus, "approved" | "rejected" | "expired">,
): Promise<boolean> {
  const result = await db
    .update(aiPendingActions)
    .set({ status, resolvedAt: new Date() })
    .where(and(eq(aiPendingActions.id, id), eq(aiPendingActions.status, "pending")))
    .returning({ id: aiPendingActions.id });
  return result.length > 0;
}

// Housekeeping — flip anything past its deadline to `expired`. Called before
// reads so an abandoned prompt is never treated as still actionable.
export async function expireStalePendingActions(): Promise<number> {
  const result = await db
    .update(aiPendingActions)
    .set({ status: "expired", resolvedAt: new Date() })
    .where(
      and(eq(aiPendingActions.status, "pending"), lt(aiPendingActions.expiresAt, new Date())),
    )
    .returning({ id: aiPendingActions.id });
  return result.length;
}
