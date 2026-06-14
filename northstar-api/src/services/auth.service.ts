import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "../db/index.js";
import { users } from "../db/schema.js";

import { eq } from "drizzle-orm";
import { toSafeUser } from "../lib/to-safe-user.js";

export const register = async (
  email: string,
  password: string,
  name: string,
) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
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

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "1d",
    },
  );

  return {
    user: toSafeUser(user),
    token,
  };
};
