import request from "supertest";
import { describe, afterEach, it, expect, beforeEach } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

const TEST_EMAIL = "auth.test@example.com";
const TEST_PASSWORD = "password123";
const TEST_NAME = "Auth Test";

async function cleanup() {
  await db.delete(users).where(eq(users.email, TEST_EMAIL)).catch(() => {});
}

describe("POST /auth/register", () => {
  afterEach(cleanup);

  it("should register a new user (201)", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(TEST_EMAIL);
    expect(res.body.password).toBeUndefined();
  });

  it("should reject duplicate email (400)", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
  });

  afterEach(cleanup);

  it("should login and return token (200)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  it("should reject invalid credentials (400)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: TEST_EMAIL, password: "wrong" });

    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  afterEach(cleanup);

  it("should reject unauthenticated request (401)", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("should return user with valid token (200)", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

    const login = await request(app)
      .post("/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const token = login.body.token;

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(TEST_EMAIL);
  });
});
