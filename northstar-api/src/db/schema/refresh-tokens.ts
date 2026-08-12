import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { users } from "./users.js";

// Server-side refresh tokens. The cookie carries an opaque random string;
// we store ONLY its SHA-256 hash (never the raw value) so a DB leak cannot
// be replayed. Rotation invalidates the prior row; logout/revoke flips `revoked`.
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // SHA-256 hex of the opaque token handed to the client
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revoked: integer("revoked").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
