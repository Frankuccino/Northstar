import type { users } from "../db/schema/users.js";

export type User = typeof users.$inferSelect;
