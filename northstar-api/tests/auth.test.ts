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
  await db
    .delete(users)
    .where(eq(users.email, TEST_EMAIL))
    .catch(() => {});
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

async function registerAndLogin(agent = request(app)) {
  await agent
    .post("/auth/register")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
  return agent
    .post("/auth/login")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
}

describe("POST /auth/refresh", () => {
  afterEach(cleanup);

  it("should set an httpOnly refresh cookie on login", async () => {
    const login = await registerAndLogin();
    const setCookie = login.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain("northstar_refresh=");
    expect(cookieStr).toContain("HttpOnly");
    expect(cookieStr).toMatch(/Path=\/auth/);
  });

  it("should issue a new access token using the refresh cookie (200)", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent);

    const res = await agent.post("/auth/refresh").send({});
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it("should reject refresh with no cookie (401)", async () => {
    const res = await request(app).post("/auth/refresh").send({});
    expect(res.status).toBe(401);
  });

  it("should rotate the refresh token (old one invalid after refresh)", async () => {
    const agent = request.agent(app);
    const login = await registerAndLogin(agent);
    const firstCookie = login.headers["set-cookie"];

    const refresh1 = await agent.post("/auth/refresh").send({});
    expect(refresh1.status).toBe(200);

    // Reuse the ORIGINAL cookie — must now be rejected (rotated/revoked).
    const refresh2 = await request(app)
      .post("/auth/refresh")
      .set("Cookie", firstCookie as string)
      .send({});
    expect(refresh2.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  afterEach(cleanup);

  it("should revoke the refresh token and clear the cookie (200)", async () => {
    const agent = request.agent(app);
    await registerAndLogin(agent);

    const logout = await agent.post("/auth/logout").send({});
    expect(logout.status).toBe(200);

    // Refresh must fail after logout.
    const refresh = await agent.post("/auth/refresh").send({});
    expect(refresh.status).toBe(401);
  });
});

