import request from "supertest";
import { describe, afterEach, beforeEach, it, expect } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { users, projects, tasks } from "../src/db/schema.js";
import { eq, count } from "drizzle-orm";
import { __setTestProvider } from "../src/services/ai-provider.service.js";
import type { AiProvider, ChatResult } from "../src/services/ai-provider.service.js";

const TEST_EMAIL = "ai-chat.test@example.com";
const TEST_PASSWORD = "password123";
const TEST_NAME = "AI Chat Test";

async function cleanup() {
  await db.delete(users).where(eq(users.email, TEST_EMAIL)).catch(() => {});
  await db.delete(projects).where(eq(projects.name, "AI Chat Test Project")).catch(() => {});
}

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

async function createProject(token: string): Promise<number> {
  const res = await request(app)
    .post("/workspace")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "AI Chat Test Project" });
  return res.body.id;
}

// Stub provider that returns scripted responses
function stubProvider(responses: ChatResult[]): AiProvider {
  let callIndex = 0;
  return {
    async chat() {
      const r = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return r;
    },
  };
}

describe("POST /workspace/projects/:id/ai/chat", () => {
  let token: string;
  let projectId: number;

  beforeEach(async () => {
    await cleanup();
    token = await authToken();
    projectId = await createProject(token);
  });

  afterEach(async () => {
    __setTestProvider(null);
    await cleanup();
  });

  it("creates a task via tool call and reports changed=true", async () => {
    __setTestProvider(
      stubProvider([
        {
          kind: "tool_call",
          toolCallId: "tc1",
          toolCall: { name: "create_task", arguments: { title: "Test Task" } },
        },
        {
          kind: "text",
          content: "Task created.",
          message: "Task created.",
          intent: "create_task",
          payload: {},
        },
      ]),
    );

    const res = await request(app)
      .post(`/workspace/projects/${projectId}/ai/chat`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "create task called Test Task" });

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(true);
    expect(res.body.content).toContain("Task created");

    // Verify exactly one task was created (no double mutation)
    const taskCount = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    expect(taskCount[0].value).toBe(1);
  });

  it("reports changed=false for read-only requests (help)", async () => {
    __setTestProvider(
      stubProvider([
        {
          kind: "text",
          content: "Here is help.",
          message: "Here is help.",
          intent: "help",
          payload: {},
        },
      ]),
    );

    const res = await request(app)
      .post(`/workspace/projects/${projectId}/ai/chat`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "help" });

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(false);
  });

  it("chains search then move and reports changed=true", async () => {
    __setTestProvider(
      stubProvider([
        // Turn 1: search
        {
          kind: "tool_call",
          toolCallId: "tc1",
          toolCall: { name: "search_tasks", arguments: { query: "Test Task" } },
        },
        // Turn 2: move
        {
          kind: "tool_call",
          toolCallId: "tc2",
          toolCall: { name: "move_task", arguments: { taskId: 1, status: "ai_drafting" } },
        },
        // Turn 3: final text
        {
          kind: "text",
          content: "Moved.",
          message: "Moved.",
          intent: "move_task",
          payload: {},
        },
      ]),
    );

    const res = await request(app)
      .post(`/workspace/projects/${projectId}/ai/chat`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "move Test Task to ai_drafting" });

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(true);
  });

  it("returns 400 for missing message", async () => {
    const res = await request(app)
      .post(`/workspace/projects/${projectId}/ai/chat`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 503 when no AI provider is configured", async () => {
    // Temporarily remove GROQ_API_KEY
    const originalKey = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "";

    const res = await request(app)
      .post(`/workspace/projects/${projectId}/ai/chat`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "help" });

    expect(res.status).toBe(503);

    process.env.GROQ_API_KEY = originalKey;
  });
});
