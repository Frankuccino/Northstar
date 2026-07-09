import "dotenv/config";
import bcrypt from "bcrypt";
import crypto from "crypto";
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
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper) {
    throw new Error("Server configuration error: Pepper missing.");
  }

  const preHashedInput = crypto
    .createHmac("sha256", pepper)
    .update(password)
    .digest();

  const hashedPassword = await bcrypt.hash(preHashedInput, 10);

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

  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper) {
    throw new Error("Server configuration error: Pepper missing!");
  }

  let isPasswordValid = false;
  let activeUser = user;

  const userPasswordVerion = Number(user.passwordVersion);
  // Lazy Migration for old password versions
  if (userPasswordVerion === 1) {
    isPasswordValid = await bcrypt.compare(password, user.password);

    // if their password matches, seamlessly migrate them to the new pipeline on-the-fly
    if (isPasswordValid) {
      const hmacDigest = crypto
        .createHmac("sha256", pepper)
        .update(password)
        .digest();

      const hashedPassword = await bcrypt.hash(hmacDigest, 10);

      // Overwrite old hash in the database and advance their flag to version 2
      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword,
          passwordVersion: 2,
        })
        .where(eq(users.id, user.id))
        .returning();

      activeUser = updatedUser;

      console.log(
        `Seamlessly migrated ${user.email} to HMAC-SHA256 + Bcrypt security tier`,
      );
    }
  } else if (userPasswordVerion === 2) {
    // Generate the matching HMAC fingerprint first
    const hmacDigest = crypto
      .createHmac("sha256", pepper)
      .update(password)
      .digest();

    isPasswordValid = await bcrypt.compare(hmacDigest, user.password);
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
