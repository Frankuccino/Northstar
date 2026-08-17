import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ROLES, type Role } from "../../types/role.js";

const roleCheck = sql`${sql.identifier("role")} IN (${sql.raw(
  ROLES.map((r) => `'${r}'`).join(", "),
)})`;

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),

    password: text("password").notNull(),
    passwordVersion: integer("password_version").default(1).notNull(),

    role: text("role").$type<Role>().notNull().default("employee"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [check("users_role_check", roleCheck)],
);
