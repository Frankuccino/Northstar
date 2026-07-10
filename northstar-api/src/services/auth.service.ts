import "dotenv/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";

import { eq } from "drizzle-orm";
import { toSafeUser } from "../lib/to-safe-user.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import { migrateUserPassword } from "./auth-migration.service.js";

export const register = async (
  email: string,
  password: string,
  name: string,
) => {
  const hashedPassword = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
      passwordVersion: 2,
      name,
    })
    .returning();

  return user;
};

export const login = async (email: string, password: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    throw new Error("Invalid credentials");
  }

  let isPasswordValid = false;
  let activeUser = user;

  const userPasswordVersion = Number(user.passwordVersion);

  // Lazy migration for v1 password hash to v2: old password matching pipeline
  if (userPasswordVersion === 1) {
    isPasswordValid = await bcrypt.compare(password, user.password);
    // password match with the old pipeline -> migrate them to new pipeline on the fly.
    if (isPasswordValid) {
      activeUser = await migrateUserPassword(user, password);
    }
  } else if (userPasswordVersion === 2) {
    isPasswordValid = await verifyPassword(password, user.password);
  }

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      id: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "1d",
    },
  );

  return {
    user: toSafeUser(activeUser),
    token,
  };
};
