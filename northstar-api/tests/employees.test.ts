import request from "supertest";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

const TEST_ADMIN = {
  email: "admin@test.com",
  password: "123456",
  name: "Admin",
};

const TEST_USER = {
  email: "user@test.com",
  password: "123456",
  name: "User",
};

// Helper: register, promote, and log in — returns a bearer token
async function createAdminAndLogin(): Promise<string> {
  await request(app).post("/auth/register").send(TEST_ADMIN);

  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, TEST_ADMIN.email));

  const login = await request(app).post("/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });

  return login.body.token;
}

async function createUserAndLogin(): Promise<string> {
  await request(app).post("/auth/register").send({
    email: TEST_USER.email,
    password: TEST_USER.password,
    name: TEST_USER.name,
  });
  const login = await request(app).post("/auth/login").send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  return login.body.token;
}

// Helper: wipe the test user after each test
async function cleanupTestUser() {
  await db.delete(users).where(eq(users.email, TEST_ADMIN.email));
  await db.delete(users).where(eq(users.email, "user@test.com"));
}

describe("Employees API '/employees'", () => {
  afterEach(async () => {
    await cleanupTestUser();
  });
  // Unauthenticated Request (No Token)
  it("should reject unauthenticated requests (401)", async () => {
    const res = await request(app).get("/employees");
    expect(res.status).toBe(401);
  });
  // Authentication - Invalid Token
  it("should reject an invalid token (401 | 403)", async () => {
    const res = await request(app)
      .get("/employees")
      .set("Authorization", "Bearer invalid_token");
    expect([401, 403]).toContain(res.status);
  });
  // Authorization - Authenticated | Valid Role (Admin)
  it("should allow an admin to fetch employees (200)", async () => {
    const token = await createAdminAndLogin();

    const res = await request(app)
      .get("/employees")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined(); // add shape assertions as your API matures
  });
  // Authorization - Authenticated | Invalid Role (User)
  it("should reject a non-admin user with (403)", async () => {
    const token = await createUserAndLogin();

    const res = await request(app)
      .get("/employees")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
