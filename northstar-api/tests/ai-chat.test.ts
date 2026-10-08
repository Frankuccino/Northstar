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

// Capturing stub — records the params of every provider.chat() call so tests can
// inspect the tool-result messages fed back to the LLM. Tool envelopes are not
// exposed on the HTTP response, so this is the only way to assert their shape.
function capturingProvider(responses: ChatResult[]) {
  let callIndex = 0;
  const calls: Array<{ previousMessages?: any[] }> = [];
  const provider: AiProvider = {
    async chat(params) {
      calls.push(params as any);
      const r = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      return r;
    },
  };
  return { provider, calls };
}

// Extract the tool-result envelopes fed back to the LLM. previousMessages
// accumulates across turns, so the same message can appear in several calls —
// dedupe by raw content to keep one entry per tool execution.
function toolEnvelopes(calls: Array<{ previousMessages?: any[] }>): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const call of calls) {
    for (const m of call.previousMessages ?? []) {
      if (m.role !== "tool" || typeof m.content !== "string") continue;
      if (seen.has(m.content)) continue;
      seen.add(m.content);
      try {
        out.push(JSON.parse(m.content));
      } catch {
        // not JSON — ignore
      }
    }
  }
  return out;
}

// A text result for terminating a scripted conversation.
function textResult(content = "done"): ChatResult {
  return { kind: "text", content, message: content, intent: "unknown", payload: {} };
}

function toolCallResult(
  id: string,
  name: string,
  args: Record<string, unknown>,
): ChatResult {
  return { kind: "tool_call", toolCallId: id, toolCall: { name, arguments: args } };
}

async function chat(token: string, projectId: number, message: string) {
  return request(app)
    .post(`/workspace/projects/${projectId}/ai/chat`)
    .set("Authorization", `Bearer ${token}`)
    .send({ message });
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

describe("tool result envelope contract", () => {
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

  // Every tool must return the same envelope shape, so the LLM, the HTTP
  // response, and the future streaming layer all read one contract.
  const cases: Array<{ tool: string; args: Record<string, unknown> }> = [
    { tool: "search_tasks", args: { query: "anything" } },
    { tool: "create_task", args: { title: "Envelope Task" } },
    { tool: "move_task", args: { taskId: 1, status: "ai_drafting" } },
    { tool: "assign_task", args: { taskId: 1, assigneeName: "Nobody" } },
    { tool: "list_tasks", args: {} },
    { tool: "help", args: {} },
  ];

  for (const { tool, args } of cases) {
    it(`${tool} returns a valid envelope`, async () => {
      const { provider, calls } = capturingProvider([
        toolCallResult("tc1", tool, args),
        textResult(),
      ]);
      __setTestProvider(provider);

      await chat(token, projectId, `run ${tool}`);

      const envelopes = toolEnvelopes(calls);
      const env = envelopes.find((e) => e.tool === tool);
      expect(env, `no envelope emitted for ${tool}`).toBeDefined();

      // Shared envelope contract
      expect(typeof env.ok).toBe("boolean");
      expect(env.tool).toBe(tool);
      expect(typeof env.summary).toBe("string");
      expect(env.summary.length).toBeGreaterThan(0);

      // Errors carry a structured code; successes do not
      if (env.ok) {
        expect(env.error).toBeUndefined();
      } else {
        expect(typeof env.error?.code).toBe("string");
        expect(typeof env.error?.message).toBe("string");
      }
    });
  }

  it("search_tasks success carries count and tasks in data", async () => {
    const { provider, calls } = capturingProvider([
      toolCallResult("tc1", "create_task", { title: "Findable" }),
      toolCallResult("tc2", "search_tasks", { query: "Findable" }),
      textResult(),
    ]);
    __setTestProvider(provider);

    await chat(token, projectId, "create then search");

    const env = toolEnvelopes(calls).find((e) => e.tool === "search_tasks");
    expect(env.ok).toBe(true);
    expect(env.data.count).toBe(1);
    expect(env.data.tasks[0].title).toBe("Findable");
    expect(env.data.query).toBe("Findable");
  });

  it("create_task success carries the new taskId", async () => {
    const { provider, calls } = capturingProvider([
      toolCallResult("tc1", "create_task", { title: "Has Id" }),
      textResult(),
    ]);
    __setTestProvider(provider);

    await chat(token, projectId, "create Has Id");

    const env = toolEnvelopes(calls).find((e) => e.tool === "create_task");
    expect(env.ok).toBe(true);
    expect(typeof env.data.taskId).toBe("number");
    expect(env.data.status).toBe("backlog");
  });
});

describe("tool error handling", () => {
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

  it("missing required arg returns MISSING_ARG, not a 500", async () => {
    const { provider, calls } = capturingProvider([
      toolCallResult("tc1", "create_task", {}),
      textResult(),
    ]);
    __setTestProvider(provider);

    const res = await chat(token, projectId, "create nothing");

    expect(res.status).toBe(200);
    const env = toolEnvelopes(calls).find((e) => e.tool === "create_task");
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("MISSING_ARG");
  });

  it("invalid status returns INVALID_STATUS", async () => {
    const { provider, calls } = capturingProvider([
      toolCallResult("tc1", "move_task", { taskId: 1, status: "not_a_column" }),
      textResult(),
    ]);
    __setTestProvider(provider);

    const res = await chat(token, projectId, "move to nonsense");

    expect(res.status).toBe(200);
    const env = toolEnvelopes(calls).find((e) => e.tool === "move_task");
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("INVALID_STATUS");
  });

  it("unknown assignee returns USER_NOT_FOUND with availableUsers", async () => {
    const { provider, calls } = capturingProvider([
      toolCallResult("tc1", "create_task", { title: "Assign Me" }),
      toolCallResult("tc2", "assign_task", {
        taskId: 1,
        assigneeName: "Definitely Not A Real Person",
      }),
      textResult(),
    ]);
    __setTestProvider(provider);

    await chat(token, projectId, "assign to a ghost");

    const env = toolEnvelopes(calls).find((e) => e.tool === "assign_task");
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("USER_NOT_FOUND");
    expect(Array.isArray(env.data.availableUsers)).toBe(true);
  });

  it("unknown tool returns UNKNOWN_TOOL", async () => {
    const { provider, calls } = capturingProvider([
      toolCallResult("tc1", "delete_everything", {}),
      textResult(),
    ]);
    __setTestProvider(provider);

    const res = await chat(token, projectId, "do something undefined");

    expect(res.status).toBe(200);
    const env = toolEnvelopes(calls).find((e) => e.tool === "delete_everything");
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("UNKNOWN_TOOL");
  });
});

describe("hadSearchStep flag", () => {
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

  it("is false when no search ran", async () => {
    __setTestProvider(
      stubProvider([toolCallResult("tc1", "list_tasks", {}), textResult()]),
    );

    const res = await chat(token, projectId, "list tasks");

    expect(res.status).toBe(200);
    expect(res.body.hadSearchStep).toBe(false);
  });

  it("is true when a search ran mid-flow", async () => {
    __setTestProvider(
      stubProvider([
        toolCallResult("tc1", "create_task", { title: "Search Target" }),
        toolCallResult("tc2", "search_tasks", { query: "Search Target" }),
        textResult(),
      ]),
    );

    const res = await chat(token, projectId, "create then search");

    expect(res.status).toBe(200);
    expect(res.body.hadSearchStep).toBe(true);
  });
});
