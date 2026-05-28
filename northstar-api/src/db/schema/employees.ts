import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),

  firstName: text("first_name").notNull(),

  lastName: text("last_name").notNull(),

  email: text("email").notNull().unique(),

  position: text("position").notNull(),

  department: text("department").notNull(),

  status: text("status").default("active"),

  createdAt: timestamp("created_at").defaultNow(),
});
