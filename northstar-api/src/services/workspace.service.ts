import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  projects,
  tasks,
  aiSuggestions,
  taskValidations,
  commitRecords,
  type SuggestionType,
} from "../db/schema.js";
import type { TaskStatus } from "../types/task-status.js";
import { assertTransition, canTransition, wipLimitFor } from "./workspace/state-machine.js";
import { canDeleteTask, type Actor } from "./workspace/access.js";
import { aiProvider, type SuggestionType as AiSuggestionType } from "../lib/ai/provider.js";

// ---- Projects -------------------------------------------------------------
export const createProject = async (name: string, description?: string) => {
  const [project] = await db
    .insert(projects)
    .values({ name, description })
    .returning();
  return project;
};

export const getProjects = async () => db.select().from(projects);

export const getProject = async (id: number) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) throw new Error("Project not found");
  return project;
};

// ---- Tasks ----------------------------------------------------------------
// Count tasks in a column for a project (optionally excluding one task, e.g. the
// card being moved so it doesn't count against its own destination cap).
const countTasksInColumn = async (
  projectId: number,
  status: TaskStatus,
  excludeTaskId?: number,
) => {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      excludeTaskId !== undefined
        ? and(
            eq(tasks.projectId, projectId),
            eq(tasks.status, status),
            sql`${tasks.id} <> ${excludeTaskId}`,
          )
        : and(eq(tasks.projectId, projectId), eq(tasks.status, status)),
    );
  return rows.length;
};

export const createTask = async (
  projectId: number,
  title: string,
  description?: string,
  assigneeId?: number,
) => {
  // New tasks always enter `backlog`; enforce that column's WIP cap.
  const limit = wipLimitFor("backlog");
  const count = await countTasksInColumn(projectId, "backlog");
  if (count >= limit) {
    throw new Error(`WIP limit reached for backlog (cap ${limit})`);
  }

  const [task] = await db
    .insert(tasks)
    .values({ projectId, title, description, assigneeId, status: "backlog" })
    .returning();
  return task;
};

export const getTasksByProject = async (projectId: number) =>
  db.select().from(tasks).where(eq(tasks.projectId, projectId));

// Server-authoritative move. Rejects illegal transitions; the UI cannot
// launder a card into an invalid state.
export const moveTask = async (taskId: number, to: TaskStatus) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error("Task not found");

  // Enforce the destination column's WIP cap. Exclude the card itself so moving
  // within (or back into) a column it already occupies doesn't count against it.
  const limit = wipLimitFor(to);
  const count = await countTasksInColumn(task.projectId, to, taskId);
  if (count >= limit) {
    throw new Error(`WIP limit reached for ${to} (cap ${limit})`);
  }

  assertTransition(task.status, to);
  const [updated] = await db
    .update(tasks)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();
  return updated;
};

// Delete is gated by the board-scoped permission helper. The helper's signature
// already takes (actor, projectId) so the future per-board ABAC model can swap
// its body without touching this call site (see docs/BOARD_ACCESS_MODEL.md).
export const deleteTask = async (actor: Actor, taskId: number) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error("Task not found");

  const allowed = await canDeleteTask(actor, task.projectId);
  if (!allowed) {
    throw new Error("Forbidden: insufficient permission to delete this task");
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));
  return { id: taskId };
};

// ---- AI suggestions (versioned, async-ready) ------------------------------
// Returns the latest version of every suggestion type for a task. Edits/regens
// insert NEW rows; existing rows are never mutated (audit integrity).
export const getLatestSuggestions = async (taskId: number) => {
  const all = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.taskId, taskId))
    .orderBy(desc(aiSuggestions.version));
  const latest = new Map<SuggestionType, (typeof all)[number]>();
  for (const s of all) {
    if (!latest.has(s.type)) latest.set(s.type, s);
  }
  return [...latest.values()];
};

// Stubbed generation. In production this would be enqueued (Ep14) and run async;
// here it runs inline against the StubAiProvider so the flow is exercisable.
export const generateSuggestion = async (
  taskId: number,
  type: AiSuggestionType,
) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error("Task not found");

  const existing = await db
    .select()
    .from(aiSuggestions)
    .where(and(eq(aiSuggestions.taskId, taskId), eq(aiSuggestions.type, type)))
    .orderBy(desc(aiSuggestions.version))
    .limit(1);
  const nextVersion = (existing[0]?.version ?? 0) + 1;

  const content = await aiProvider.generate(type, task.title);

  const [suggestion] = await db
    .insert(aiSuggestions)
    .values({
      taskId,
      version: nextVersion,
      type,
      content,
      promptSnapshot: `stub:${type}`,
      model: aiProvider.name,
    })
    .returning();
  return suggestion;
};

// ---- Human validation (the trust gate) ------------------------------------
export const validateSuggestion = async (
  taskId: number,
  suggestionId: number,
  decision: "accept" | "reject" | "edit",
  actorId: number,
  reason?: string,
) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error("Task not found");
  const [suggestion] = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, suggestionId));
  if (!suggestion) throw new Error("Suggestion not found");

  const [validation] = await db
    .insert(taskValidations)
    .values({ taskId, suggestionId, decision, reason, actorId })
    .returning();

  // A rejection sends the task back for revision; an accept/approval can move
  // it toward validated. The state machine enforces legality — only move when
  // the transition is actually allowed, otherwise just record the validation so
  // the human-in-the-loop action never crashes on an illegal transition.
  const target: TaskStatus =
    decision === "reject" ? "needs_revision" : "validated";
  if (canTransition(task.status, target)) {
    await moveTask(taskId, target);
  }
  return validation;
};

// ---- Mark validated (human approval shortcut) ----------------------------
// Provides a path to `validated` (the commit prerequisite) that does NOT depend
// on AI suggestions. Walks forward through ONLY legal transitions until it can
// reach `validated`, so it works from any starting status (e.g. a freshly
// created `backlog` task with no suggestions yet). Terminal states (`validated`,
// `done`) are no-ops — they're already at/beyond the target.
const VALIDATED_WALK: Record<TaskStatus, TaskStatus | null> = {
  backlog: "in_progress",
  ai_drafting: "ready",
  ready: "in_progress",
  in_progress: "validated",
  needs_revision: "in_progress",
  validated: null,
  done: null,
};

export const markValidated = async (taskId: number) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error("Task not found");

  let current = task.status as TaskStatus;
  // Guard against any unexpected loop in the transition graph.
  for (let i = 0; i < 10 && current !== "validated"; i++) {
    const next = VALIDATED_WALK[current];
    if (!next) break;
    if (!canTransition(current, next)) break;
    await moveTask(taskId, next);
    current = next;
  }
  const [updated] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  return updated;
};

// ---- Commit records (AI-guided, human-approved) ---------------------------
export const approveCommit = async (
  taskId: number,
  message: string,
  justification: string,
  approvedBy: number,
) => {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new Error("Task not found");
  if (task.status !== "validated") {
    throw new Error("Cannot commit a task that is not validated");
  }
  const [record] = await db
    .insert(commitRecords)
    .values({ taskId, message, justification, approvedBy })
    .returning();
  await moveTask(taskId, "done");
  return record;
};
