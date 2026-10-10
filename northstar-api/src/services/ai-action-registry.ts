import type { AiTool } from "./ai-provider.service.js";
import { createTask, moveTask, assignTask, searchTasks, getTasksByProject, getAssignableUsers } from "./workspace.service.js";

// ---- Types -----------------------------------------------------------------

export interface ActionContext {
  projectId: number;
  userId: number;
  userRole: string;
}

export type ActionHandler = (
  args: Record<string, unknown>,
  ctx: ActionContext,
) => Promise<string>;

export interface ActionEntry {
  name: string;
  description: string;
  parameters: Record<string, any>;
  /** Human-readable label for the system prompt */
  promptLabel: string;
  handler: ActionHandler;
}

// ---- Constants -------------------------------------------------------------

const TASK_STATUSES = [
  "backlog",
  "ai_drafting",
  "ready",
  "in_progress",
  "needs_revision",
  "validated",
  "done",
] as const;

// ---- Helpers ---------------------------------------------------------------

function summarizeTasks(tasks: any[]) {
  return tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
  }));
}

function toolOk(
  tool: string,
  summary: string,
  data?: Record<string, unknown>,
): string {
  return JSON.stringify({ ok: true, tool, summary, ...(data ? { data } : {}) });
}

function toolErr(
  tool: string,
  code: string,
  message: string,
  data?: Record<string, unknown>,
): string {
  return JSON.stringify({
    ok: false,
    tool,
    summary: message,
    error: { code, message },
    ...(data ? { data } : {}),
  });
}

// ---- Registry --------------------------------------------------------------

export const actions: Record<string, ActionEntry> = {
  search_tasks: {
    name: "search_tasks",
    description:
      "Search for tasks by title or description. Use this to find a task by name before using move_task or assign_task.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    promptLabel: "Search for tasks by title or description",
    handler: async (args, ctx) => {
      const query = String(args.query ?? "").trim();
      if (!query) return toolErr("search_tasks", "MISSING_ARG", "No search query provided.");
      const results = await searchTasks(ctx.projectId, query);
      return toolOk(
        "search_tasks",
        results.length === 0
          ? `No tasks matched "${query}".`
          : `Found ${results.length} task${results.length === 1 ? "" : "s"} matching "${query}".`,
        { query, count: results.length, tasks: summarizeTasks(results) },
      );
    },
  },

  create_task: {
    name: "create_task",
    description: "Create a new task in the project.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        status: {
          type: "string",
          description:
            "Initial status (backlog, ai_drafting, ready, in_progress, needs_revision, validated, done)",
        },
      },
      required: ["title"],
    },
    promptLabel: "Create a new task in the project",
    handler: async (args, ctx) => {
      const title = String(args.title ?? "").trim();
      if (!title) return toolErr("create_task", "MISSING_ARG", "A task title is required.");
      try {
        const task = await createTask(ctx.projectId, title);
        return toolOk("create_task", `Created "${task.title}" in backlog.`, {
          taskId: task.id,
          title: task.title,
          status: task.status,
        });
      } catch (err: any) {
        return toolErr("create_task", "CREATE_FAILED", err.message);
      }
    },
  },

  move_task: {
    name: "move_task",
    description: "Move a task to a different column.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "integer",
          description: "The ID of the task to move",
        },
        status: {
          type: "string",
          enum: [...TASK_STATUSES],
          description: "Target column status",
        },
      },
      required: ["taskId", "status"],
    },
    promptLabel: "Move a task to a different column",
    handler: async (args, ctx) => {
      const taskId = Number(args.taskId);
      const status = String(args.status ?? "");
      if (!Number.isFinite(taskId))
        return toolErr("move_task", "MISSING_ARG", "A numeric taskId is required.");
      if (!TASK_STATUSES.includes(status as any))
        return toolErr(
          "move_task",
          "INVALID_STATUS",
          `Invalid status "${status}". Must be one of: ${TASK_STATUSES.join(", ")}.`,
        );
      try {
        const updated = await moveTask(taskId, status as any);
        return toolOk("move_task", `Moved "${updated.title}" to ${updated.status}.`, {
          taskId: updated.id,
          title: updated.title,
          status: updated.status,
        });
      } catch (err: any) {
        return toolErr("move_task", "MOVE_FAILED", err.message);
      }
    },
  },

  assign_task: {
    name: "assign_task",
    description: "Assign a task to a team member.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "integer",
          description: "The ID of the task to assign",
        },
        assigneeName: {
          type: "string",
          description: "Name of the person to assign",
        },
      },
      required: ["taskId", "assigneeName"],
    },
    promptLabel: "Assign a task to a team member",
    handler: async (args, ctx) => {
      const taskId = Number(args.taskId);
      const assigneeName = String(args.assigneeName ?? "").trim();
      if (!Number.isFinite(taskId))
        return toolErr("assign_task", "MISSING_ARG", "A numeric taskId is required.");
      if (!assigneeName)
        return toolErr("assign_task", "MISSING_ARG", "An assignee name is required.");
      try {
        const users = await getAssignableUsers(ctx.projectId);
        const user = users.find(
          (u: any) => u.name.toLowerCase() === assigneeName.toLowerCase(),
        );
        if (!user)
          return toolErr(
            "assign_task",
            "USER_NOT_FOUND",
            `No project member named "${assigneeName}".`,
            { availableUsers: users.map((u: any) => u.name) },
          );
        const updated = await assignTask(taskId, 0, user.id);
        return toolOk("assign_task", `Assigned "${updated.title}" to ${user.name}.`, {
          taskId: updated.id,
          title: updated.title,
          assignee: user.name,
        });
      } catch (err: any) {
        return toolErr("assign_task", "ASSIGN_FAILED", err.message);
      }
    },
  },

  list_tasks: {
    name: "list_tasks",
    description: "List all tasks in the project.",
    parameters: { type: "object", properties: {} },
    promptLabel: "List all tasks in the project",
    handler: async (_args, ctx) => {
      const allTasks = await getTasksByProject(ctx.projectId);
      return toolOk(
        "list_tasks",
        allTasks.length === 0
          ? "The board has no tasks."
          : `Listed ${allTasks.length} task${allTasks.length === 1 ? "" : "s"}.`,
        { count: allTasks.length, tasks: summarizeTasks(allTasks) },
      );
    },
  },

  help: {
    name: "help",
    description: "Show help information about what you can do.",
    parameters: { type: "object", properties: {} },
    promptLabel: "Show help information",
    handler: async () => {
      return toolOk("help", "Returned usage help.", {
        usage: [
          "Create a task called Fix bug",
          "Move Fix bug to done",
          "Assign Fix bug to John",
          "Search for bug",
          "List all tasks",
        ],
      });
    },
  },
};

// ---- Discovery API ----------------------------------------------------------

export function getToolDefinitions(): AiTool[] {
  return Object.values(actions).map((a) => ({
    name: a.name,
    description: a.description,
    parameters: a.parameters,
  }));
}

export function getSystemPromptEntries(): string[] {
  return Object.values(actions).map(
    (a) => `- ${a.name}(${Object.keys(a.parameters.properties).join(", ")}): ${a.promptLabel}`,
  );
}

export function getAction(name: string): ActionEntry | undefined {
  return actions[name];
}

export function executeAction(
  name: string,
  args: Record<string, unknown>,
  ctx: ActionContext,
): Promise<string> {
  const action = actions[name];
  if (!action) {
    return Promise.resolve(toolErr(name, "UNKNOWN_TOOL", `Unknown tool: ${name}`));
  }
  return action.handler(args, ctx);
}
