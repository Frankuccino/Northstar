import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  index,
  check,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const AI_CLIENT_SCOPES = ["read", "write", "admin"] as const satisfies readonly string[];
export type AiClientScope = (typeof AI_CLIENT_SCOPES)[number];

export const aiClients = pgTable("ai_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiKeyHash: text("api_key_hash").notNull(),
  scope: text("scope").$type<AiClientScope>().notNull().default("read"),
  rateLimit: integer("rate_limit").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

export const aiActions = pgTable("ai_actions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  actorUserId: integer("actor_user_id"),
  projectId: integer("project_id").notNull(),
  intent: text("intent").notNull(),
  result: text("result").notNull(),
  ip: text("ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Risk-gated confirmation ----------------------------------------------
// A destructive action the agent has proposed but not executed. It survives
// between the request that creates it and the one that approves it, so the
// human can decide. Durable rather than in-memory: the server may restart
// (Render spins the free tier down) between the two requests.

export const PENDING_ACTION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const satisfies readonly string[];
export type PendingActionStatus = (typeof PENDING_ACTION_STATUSES)[number];

export const aiPendingActions = pgTable(
  "ai_pending_actions",
  {
    id: text("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    actorUserId: integer("actor_user_id").notNull(),
    actionName: text("action_name").notNull(),
    args: text("args").notNull(),
    status: text("status").$type<PendingActionStatus>().notNull().default("pending"),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => [index("ai_pending_actions_project_idx").on(t.projectId)],
);
