import { eq, and, desc, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../db/index.js";
import {
  aiClients,
  aiActions,
  projectMembers,
  tasks,
  type AiClientScope,
} from "../db/schema.js";

const SCOPES: Record<AiClientScope, string[]> = {
  read: ["list_tasks", "get_task"],
  write: ["list_tasks", "get_task", "create_task", "move_task", "assign_task"],
  admin: [
    "list_tasks",
    "get_task",
    "create_task",
    "move_task",
    "assign_task",
    "list_invitations",
    "create_invitation",
  ],
};

export function hashAiApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function verifyAiClient(apiKey: string) {
  const hash = hashAiApiKey(apiKey);
  const [client] = await db
    .select()
    .from(aiClients)
    .where(and(eq(aiClients.apiKeyHash, hash), isNull(aiClients.revokedAt)))
    .limit(1);

  if (!client) {
    throw new Error("Invalid AI client credentials");
  }

  return client;
}

export async function isAiActionAllowed(
  scope: AiClientScope,
  intent: string,
): Promise<boolean> {
  return SCOPES[scope]?.includes(intent) ?? false;
}

export async function isUserProjectMember(
  userId: number,
  projectId: number,
): Promise<boolean> {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.projectId, projectId),
      ),
    )
    .limit(1);

  return !!member;
}

export async function executeAiIntent(params: {
  clientId: number;
  actorUserId?: number;
  projectId: number;
  intent: string;
  payload: Record<string, unknown>;
  ip?: string;
}) {
  const { clientId, actorUserId, projectId, intent, payload, ip } = params;

  const [client] = await db
    .select()
    .from(aiClients)
    .where(eq(aiClients.id, clientId))
    .limit(1);

  if (!client || client.revokedAt !== null) {
    await db.insert(aiActions).values({
      clientId,
      actorUserId,
      projectId,
      intent,
      result: "error: client not found or revoked",
      ip,
    });
    throw new Error("AI client not found or revoked");
  }

  const allowed = await isAiActionAllowed(client.scope, intent);
  if (!allowed) {
    await db.insert(aiActions).values({
      clientId,
      actorUserId,
      projectId,
      intent,
      result: "error: intent not allowed for scope",
      ip,
    });
    throw new Error("Intent not allowed for this client scope");
  }

  if (actorUserId) {
    const member = await isUserProjectMember(actorUserId, projectId);
    if (!member) {
      await db.insert(aiActions).values({
        clientId,
        actorUserId,
        projectId,
        intent,
        result: "error: actor not a project member",
        ip,
      });
      throw new Error("Actor is not a project member");
    }
  }

  let result = "ok";
  let updatedTaskId: number | undefined;

  try {
    switch (intent) {
      case "list_tasks":
        // handled by caller using existing GET /workspace/:id/tasks
        break;
      case "get_task": {
        const taskId = Number(payload.taskId);
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
          .limit(1);
        if (!task) {
          result = "error: task not found";
          throw new Error("Task not found");
        }
        updatedTaskId = task.id;
        break;
      }
      case "create_task": {
        const title = String(payload.title ?? "").trim();
        if (!title) {
          result = "error: title is required";
          throw new Error("Title is required");
        }
        const [task] = await db
          .insert(tasks)
          .values({
            projectId,
            title,
            description: payload.description ? String(payload.description) : null,
            assigneeId: payload.assigneeId ? Number(payload.assigneeId) : null,
            status: "backlog",
          })
          .returning();
        updatedTaskId = task.id;
        break;
      }
      case "move_task": {
        const taskId = Number(payload.taskId);
        const status = String(payload.status ?? "");
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
          .limit(1);
        if (!task) {
          result = "error: task not found";
          throw new Error("Task not found");
        }
        const allowedStatuses = [
          "backlog",
          "ai_drafting",
          "ready",
          "in_progress",
          "needs_revision",
          "validated",
          "done",
        ];
        if (!allowedStatuses.includes(status)) {
          result = "error: invalid status";
          throw new Error("Invalid status");
        }
        const [updated] = await db
          .update(tasks)
          .set({ status: status as any, updatedAt: new Date() })
          .where(eq(tasks.id, taskId))
          .returning();
        updatedTaskId = updated.id;
        break;
      }
      case "assign_task": {
        const taskId = Number(payload.taskId);
        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
          .limit(1);
        if (!task) {
          result = "error: task not found";
          throw new Error("Task not found");
        }
        const assigneeId = payload.assigneeId
          ? Number(payload.assigneeId)
          : null;
        const [updated] = await db
          .update(tasks)
          .set({ assigneeId, updatedAt: new Date() })
          .where(eq(tasks.id, taskId))
          .returning();
        updatedTaskId = updated.id;
        break;
      }
      default:
        result = "error: unknown intent";
        throw new Error("Unknown intent");
    }
  } catch (error) {
    await db.insert(aiActions).values({
      clientId,
      actorUserId,
      projectId,
      intent,
      result: result.startsWith("error:") ? result : `error: ${(error as Error).message}`,
      ip,
    });
    throw error;
  }

  await db.insert(aiActions).values({
    clientId,
    actorUserId,
    projectId,
    intent,
    result: `ok: task=${updatedTaskId ?? "n/a"}`,
    ip,
  });

  return { ok: true, taskId: updatedTaskId };
}

export async function listAiActions(params: {
  clientId?: number;
  projectId?: number;
  limit?: number;
}) {
  const { clientId, projectId, limit = 50 } = params;
  const where = [
    clientId ? eq(aiActions.clientId, clientId) : undefined,
    projectId ? eq(aiActions.projectId, projectId) : undefined,
  ].filter(Boolean);

  if (where.length === 0) {
    return db.select().from(aiActions).orderBy(desc(aiActions.createdAt)).limit(limit);
  }

  return db
    .select()
    .from(aiActions)
    .where(and(...(where as any)))
    .orderBy(desc(aiActions.createdAt))
    .limit(limit);
}
