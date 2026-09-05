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

export const INVITATION_STATUSES = [
  "pending",
  "accepted",
  "expired",
  "revoked",
] as const satisfies readonly string[];
export type InvitationStatus =
  (typeof INVITATION_STATUSES)[number];

export const invitations = pgTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    projectId: integer("project_id").notNull(),
    invitedById: integer("invited_by_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    status: text("status")
      .$type<InvitationStatus>()
      .notNull()
      .default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("invitations_token_idx").on(table.tokenHash),
    index("invitations_expires_at_idx").on(table.expiresAt),
    index("invitations_email_project_idx").on(
      table.email,
      table.projectId,
    ),
  ],
);

export const PROJECT_MEMBER_ROLES = ["member", "admin"] as const satisfies readonly string[];
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: integer("project_id").notNull(),
    userId: integer("user_id").notNull(),
    role: text("role")
      .$type<ProjectMemberRole>()
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_members_user_id_idx").on(table.userId),
  ],
);
