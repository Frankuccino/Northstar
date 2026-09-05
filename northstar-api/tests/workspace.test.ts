import request from "supertest";
import { describe, afterEach, it, expect, beforeEach } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { users, projects, tasks, aiSuggestions, taskValidations, invitations, projectMembers } from "../src/db/schema.js";
import { eq, count } from "drizzle-orm";

const TEST_EMAIL = "workspace.test@example.com";
const EMP_EMAIL = "workspace.emp@example.com";
const TEST_PASSWORD = "password123";
const TEST_NAME = "Workspace Test";

async function cleanup() {
  await db.delete(users).where(eq(users.email, TEST_EMAIL)).catch(() => {});
  await db.delete(users).where(eq(users.email, EMP_EMAIL)).catch(() => {});
  await db.delete(projects).where(eq(projects.name, "WS Test Project")).catch(() => {});
  await db.delete(invitations).where(eq(invitations.email, "invitee@example.com")).catch(() => {});
}

// Register, promote to admin, and log in — returns a Bearer access token.
// Mirrors the employees.test convention (project/task creation requires
// admin/manager per the workspace route gating).
async function authToken(): Promise<string> {
  await request(app)
    .post("/auth/register")
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      name: TEST_NAME,
    });
  await db.update(users).set({ role: "admin" }).where(eq(users.email, TEST_EMAIL));
  const login = await request(app)
    .post("/auth/login")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  return login.body.token;
}

// Register and log in as the default role (employee) — no promotion.
async function employeeToken(): Promise<string> {
  await request(app)
    .post("/auth/register")
    .send({
      email: EMP_EMAIL,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      name: "Emp",
    });
  const login = await request(app)
    .post("/auth/login")
    .send({ email: EMP_EMAIL, password: TEST_PASSWORD });
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
    // [G] structured error response: correlation id present, stack never leaked.
    expect(typeof res.body.errorId).toBe("string");
    expect(res.body.errorId.length).toBeGreaterThan(0);
    expect(res.body.stack).toBeUndefined();
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

  it("requires a reason when rejecting a suggestion (human-in-the-loop)", async () => {
    const token = await authToken();

    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;

    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task A" });
    const taskId = task.body.id;

    const suggestion = await request(app)
      .post(`/workspace/tasks/${taskId}/suggestions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "approach" });
    const suggestionId = suggestion.body.id;

    // reject without reason must be rejected by validation
    const res = await request(app)
      .post(`/workspace/tasks/${taskId}/validate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suggestionId, decision: "reject" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation error/i);
  });

  it("rejects a task creation when the backlog WIP cap is reached", async () => {
    const token = await authToken();

    // backlog cap is 8 (see state-machine WIP_LIMITS)
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;

    for (let i = 0; i < 8; i++) {
      const r = await request(app)
        .post(`/workspace/${projectId}/tasks`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: `Seed ${i}` });
      expect(r.status).toBe(201);
    }

    // 9th task should be rejected by the WIP guard
    const res = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Overflow" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/wip limit/i);
  });

  it("rejects a move into a column that is at its WIP cap", async () => {
    const token = await authToken();

    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;

    // in_progress cap is 4
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) {
      const t = await request(app)
        .post(`/workspace/${projectId}/tasks`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: `Seed ${i}` });
      ids.push(t.body.id);
    }
    // move all 4 to in_progress
    for (const id of ids) {
      const r = await request(app)
        .patch(`/workspace/tasks/${id}/move`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "in_progress" });
      expect(r.status).toBe(200);
    }

    // a 5th backlog task cannot move into the full in_progress column
    const extra = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Extra" });
    const extraId = extra.body.id;
    const res2 = await request(app)
      .patch(`/workspace/tasks/${extraId}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "in_progress" });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/wip limit/i);
  });

  it("requires justification when approving a commit", async () => {
    const token = await authToken();

    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;

    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task A" });
    const taskId = task.body.id;

    // walk the task to validated
    await request(app)
      .patch(`/workspace/tasks/${taskId}/validate-task`)
      .set("Authorization", `Bearer ${token}`);

    // commit without justification must be rejected by validation
    const res = await request(app)
      .post(`/workspace/tasks/${taskId}/commit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "ship it" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validation error/i);
  });
});

describe("DELETE /workspace/tasks/:id (defect [Y] foundation)", () => {
  afterEach(cleanup);
  beforeEach(cleanup);

  it("allows an admin to delete a task (200)", async () => {
    const token = await authToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;
    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task A" });
    const taskId = task.body.id;

    const res = await request(app)
      .delete(`/workspace/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(taskId);
  });

  it("forbids an employee from deleting a task (403)", async () => {
    const admin = await authToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${admin}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;
    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ title: "Task A" });
    const taskId = task.body.id;

    const empToken = await employeeToken();
    const res = await request(app)
      .delete(`/workspace/tasks/${taskId}`)
      .set("Authorization", `Bearer ${empToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/forbidden/i);
  });
});

describe("GET /workspace/:id/tasks — assignee name (defect display)", () => {
  afterEach(cleanup);
  beforeEach(cleanup);

  it("returns assigneeName for an assigned task, null when unassigned", async () => {
    const token = await authToken();
    const [me] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, TEST_EMAIL));

    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "WS Test Project" });
    const projectId = project.body.id;

    const assigned = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Assigned", assigneeId: me.id });
    const unassigned = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Unassigned" });

    const res = await request(app)
      .get(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const byId = new Map((res.body as any[]).map((t: any) => [t.id, t]));
    expect(byId.get(assigned.body.id).assigneeName).toBe(me.name);
    expect(byId.get(unassigned.body.id).assigneeName).toBeNull();
  });
});

describe("GET /workspace/users — assignable users", () => {
  afterEach(cleanup);
  beforeEach(cleanup);

  it("returns { id, name }[] for authenticated users", async () => {
    const token = await authToken();
    const [admin, ...rest] = await db
      .select({ id: users.id, name: users.name })
      .from(users);
    const res = await request(app)
      .get("/workspace/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // admin + any seeded users present
    const byId = new Map((res.body as any[]).map((u: any) => [u.id, u]));
    expect(byId.has(admin.id)).toBe(true);
    expect(byId.get(admin.id)).toEqual({ id: admin.id, name: admin.name });
  });
});

describe("PATCH /workspace/tasks/:id/assign", () => {
  afterEach(cleanup);
  beforeEach(cleanup);

  it("reassigns a task to another user (200)", async () => {
    const token = await authToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Assign Project" });
    const projectId = project.body.id;

    const me = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, TEST_EMAIL))
      .limit(1);
    const meId = (me[0] as any)?.id;
    expect(meId).toBeTruthy();

    const other = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, TEST_EMAIL))
      .limit(2);
    const otherId = (other[1] as any)?.id ?? meId;

    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Assignable task" });
    const taskId = task.body.id;

    const res = await request(app)
      .patch(`/workspace/tasks/${taskId}/assign`)
      .set("Authorization", `Bearer ${token}`)
      .send({ assigneeId: otherId });
    expect(res.status).toBe(200);
    expect(res.body.assigneeId).toBe(otherId);
  });

  it("clears the assignee when assigneeId is null (200)", async () => {
    const token = await authToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Clear Assign Project" });
    const projectId = project.body.id;

    const me = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, TEST_EMAIL))
      .limit(1);
    const meId = (me[0] as any)?.id;

    const task = await request(app)
      .post(`/workspace/${projectId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Unassignable task", assigneeId: meId });
    const taskId = task.body.id;

    const res = await request(app)
      .patch(`/workspace/tasks/${taskId}/assign`)
      .set("Authorization", `Bearer ${token}`)
      .send({ assigneeId: null });
    expect(res.status).toBe(200);
    expect(res.body.assigneeId).toBeNull();
  });

  it("returns 404 for a nonexistent task", async () => {
    const token = await authToken();
    const res = await request(app)
      .patch("/workspace/tasks/999999/assign")
      .set("Authorization", `Bearer ${token}`)
      .send({ assigneeId: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe("project invitations", () => {
  afterEach(cleanup);
  beforeEach(cleanup);

  it("creates a pending invitation and returns a token", async () => {
    const token = await authToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Invite Project" });
    const projectId = project.body.id;

    const res = await request(app)
      .post(`/workspace/projects/${projectId}/invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "invitee@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("invitee@example.com");
    expect(res.body.status).toBe("pending");
    expect(res.body.rawToken).toBeTruthy();
  });

  it("lists project invitations", async () => {
    const token = await authToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Invite List Project" });
    const projectId = project.body.id;

    await request(app)
      .post(`/workspace/projects/${projectId}/invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "invitee@example.com" });

    const res = await request(app)
      .get(`/workspace/projects/${projectId}/invitations`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe("invitee@example.com");
  });

  it("accepts an invitation and creates project membership", async () => {
    const token = await authToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Invite Accept Project" });
    const projectId = project.body.id;

    const invite = await request(app)
      .post(`/workspace/projects/${projectId}/invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "invitee@example.com" });

    const rawToken = invite.body.rawToken;

    await request(app)
      .post("/auth/register")
      .send({ email: "invitee@example.com", password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD, name: "Invitee" });
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "invitee@example.com", password: TEST_PASSWORD });
    const inviteeToken = login.body.token;

    const res = await request(app)
      .post("/workspace/invitations/accept")
      .set("Authorization", `Bearer ${inviteeToken}`)
      .send({ rawToken });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");
  });

  it("forbids employees from creating invitations", async () => {
    const empToken = await employeeToken();
    const project = await request(app)
      .post("/workspace")
      .set("Authorization", `Bearer ${await authToken()}`)
      .send({ name: "Emp Invite Project" });
    const projectId = project.body.id;

    const res = await request(app)
      .post(`/workspace/projects/${projectId}/invitations`)
      .set("Authorization", `Bearer ${empToken}`)
      .send({ email: "invitee@example.com" });

    expect(res.status).toBe(403);
  });
});
