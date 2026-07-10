import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../lib/auth.js";

export const migrateUserPassword = async (user: any, password: string) => {
  const hashedPassword = await hashPassword(password);

  const [updateUser] = await db
    .update(users)
    .set({
      password: hashedPassword,
      passwordVersion: 2,
    })
    .where(eq(users.id, user.id))
    .returning();

  console.log(
    `Seamlessly migrated ${user.email} to HMAC-SHA256 + Bcrypt security tier.`,
  );
  return updateUser;
};
