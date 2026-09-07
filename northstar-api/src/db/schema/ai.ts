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
