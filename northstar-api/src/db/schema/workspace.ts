import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { TASK_STATUSES, type TaskStatus } from "../../types/task-status.js";

// ---- Projects -------------------------------------------------------------
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---- Tasks ----------------------------------------------------------------
export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").$type<TaskStatus>().notNull().default("backlog"),
    assigneeId: integer("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "tasks_status_check",
      sql`${table.status} IN (${sql.raw(TASK_STATUSES.map((s: TaskStatus) => `'${s}'`).join(", "))})`,
    ),
  ],
);

// ---- AI Suggestions (versioned, never overwritten) ------------------------
export type SuggestionType =
  | "context"
  | "approach"
  | "checklist"
  | "draft"
  | "commit_guidance";

export const SUGGESTION_TYPES = [
  "context",
  "approach",
  "checklist",
  "draft",
  "commit_guidance",
] as const satisfies readonly SuggestionType[];

export const aiSuggestions = pgTable(
  "ai_suggestions",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    type: text("type").$type<SuggestionType>().notNull(),
    content: text("content").notNull(),
    promptSnapshot: text("prompt_snapshot"),
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // one monotonically-increasing version sequence per (task, type)
    uniqueIndex("ai_suggestions_task_type_version_uniq").on(
      table.taskId,
      table.type,
      table.version,
    ),
  ],
);

// ---- Task Validations (human action, audited) -----------------------------
export type ValidationDecision = "accept" | "reject" | "edit";

export const taskValidations = pgTable("task_validations", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  suggestionId: integer("suggestion_id")
    .notNull()
    .references(() => aiSuggestions.id, { onDelete: "cascade" }),
  decision: text("decision").$type<ValidationDecision>().notNull(),
  reason: text("reason"),
  actorId: integer("actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Commit Records (AI-guided, human-approved) ---------------------------
export const commitRecords = pgTable("commit_records", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  justification: text("justification"),
  approvedBy: integer("approved_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type TaskValidation = typeof taskValidations.$inferSelect;
export type CommitRecord = typeof commitRecords.$inferSelect;
