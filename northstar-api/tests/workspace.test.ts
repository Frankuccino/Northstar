import request from "supertest";
import { describe, afterEach, it, expect, beforeEach } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { users, projects, tasks, aiSuggestions, taskValidations } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

const TEST_EMAIL = "workspace.test@example.com";
const TEST_PASSWORD = "password123";
const TEST_NAME = "Workspace Test";

async function cleanup() {
  await db.delete(users).where(eq(users.email, TEST_EMAIL)).catch(() => {});
  await db.delete(projects).where(eq(projects.name, "WS Test Project")).catch(() => {});
}

// Register, promote to admin, and log in — returns a Bearer access token.
// Mirrors the employees.test convention (project/task creation requires
// admin/manager per the workspace route gating).
async function authToken(): Promise<string> {
  await request(app)
    .post("/auth/register")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });
  await db.update(users).set({ role: "admin" }).where(eq(users.email, TEST_EMAIL));
  const login = await request(app)
    .post("/auth/login")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  return login.body.token;
}

describe("workspace state machine (server-authoritative)", () => {
  afterEach(cleanup);
  beforeEach(cleanup);

  it("rejects an illegal transition via the API", async () => {
    const token = await authToken();

    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;

    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId, title: "Task A" });
    const taskId = task.body.id;

    // backlog -> done is illegal (skips the whole pipeline)
    const res = await request(app)
      .patch(`/workspace/tasks/${taskId}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "done" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/illegal task transition/i);
  });

  it("allows a legal transition and records an AI suggestion + validation", async () => {
    const token = await authToken();

    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;

    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId, title: "Task A" });
    const taskId = task.body.id;

    // legal: backlog -> in_progress
    const moved = await request(app)
      .patch(`/workspace/tasks/${taskId}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "in_progress" });
    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe("in_progress");

    // generate a stubbed suggestion
    const suggestion = await request(app)
      .post(`/workspace/tasks/${taskId}/suggestions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "approach" });
    expect(suggestion.status).toBe(201);
    expect(suggestion.body.content).toMatch(/approach/i);

    // validate (accept) -> moves task to validated
    const validation = await request(app)
      .post(`/workspace/tasks/${taskId}/validate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suggestionId: suggestion.body.id, decision: "accept" });
    expect(validation.status).toBe(201);

    const after = await request(app)
      .get(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`);
    expect(after.body[0].status).toBe("validated");
  });

  it("forbids project creation for an unauthenticated request", async () => {
    const res = await request(app).post("/workspace").send({ name: "X" });
    expect(res.status).toBe(401);
  });
});
