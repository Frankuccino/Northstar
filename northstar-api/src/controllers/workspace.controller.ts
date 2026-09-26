import type { Request, Response, NextFunction } from "express";
import type { AiTool, ChatResult } from "../services/ai-provider.service.js";
import {
  createProject,
  createTask,
  getProjects,
  getProject,
  getTasksByProject,
  moveTask,
  generateSuggestion,
  getLatestSuggestions,
  validateSuggestion,
  markValidated,
  approveCommit,
  deleteTask,
  deleteProject,
  updateProject,
  updateTask,
  assignTask,
  getAssignableUsers,
  getLabels,
  createLabel,
  deleteLabel,
  addLabelToTask,
  removeLabelFromTask,
  getTaskLabels,
  getTaskComments,
  createTaskComment,
  deleteTaskComment,
  updateTaskPriority,
  updateTaskDueDate,
  searchTasks,
} from "../services/workspace.service.js";
import { getProjectMembersWithStats } from "../services/project-member.service.js";
import {
  createInvitation,
  getProjectInvitations,
  acceptInvitation,
  revokeInvitation,
  getMyInvitations,
} from "../services/invitation.service.js";
import {
  verifyAiClient,
  executeAiIntent,
  listAiActions,
} from "../services/ai.service.js";
import { registerAiClient } from "../services/ai-client.service.js";
import { getAiProvider } from "../services/ai-provider.service.js";
import { listTasksQuerySchema, listInvitationsQuerySchema } from "../schemas/workspace.schema.js";
import { executeAiIntentSchema, listAiActionsQuerySchema } from "../schemas/workspace.schema.js";

export const createProjectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description } = req.body;
    const project = await createProject(name, description);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
};

export const listProjectsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await getProjects());
  } catch (err) {
    next(err);
  }
};

export const getProjectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await getProject(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
};

export const updateProjectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const updated = await updateProject(Number(req.params.id), req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const getProjectMembersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = Number(req.params.id);
    const members = await getProjectMembersWithStats(projectId);
    res.json(members);
  } catch (err) {
    next(err);
  }
};

export const updateTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const updated = await updateTask(Number(req.params.id), req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const createTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title, description, assigneeId, priority, dueDate } = req.body;
    const task = await createTask(
      Number(req.params.id),
      title,
      description,
      assigneeId,
      priority,
      dueDate,
    );
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

export const listTasksHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = listTasksQuerySchema.parse(req.query);
    const tasks = await getTasksByProject(Number(req.params.id), {
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId ?? undefined,
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

export const moveTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await moveTask(Number(req.params.id), req.body.status);
    res.json(task);
  } catch (err) {
    next(err);
  }
};

export const assignTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { assigneeId } = req.body;
    const actorId = req.user!.id;
    const task = await assignTask(
      Number(req.params.id),
      actorId,
      assigneeId,
    );
    res.json(task);
  } catch (err) {
    next(err);
  }
};

export const generateSuggestionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const suggestion = await generateSuggestion(
      Number(req.params.id),
      req.body.type,
    );
    res.status(201).json(suggestion);
  } catch (err) {
    next(err);
  }
};

export const listSuggestionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await getLatestSuggestions(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
};

export const validateSuggestionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { suggestionId, decision, reason } = req.body;
    const actorId = req.user!.id;
    const validation = await validateSuggestion(
      Number(req.params.id),
      suggestionId,
      decision,
      actorId,
      reason,
    );
    res.status(201).json(validation);
  } catch (err) {
    next(err);
  }
};

export const markValidatedHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await markValidated(Number(req.params.id));
    res.json(task);
  } catch (err) {
    next(err);
  }
};

export const deleteTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // `req.user` is the verified AuthPayload (id + role already coerced via
    // isRole in verifyAccessToken). Deletion authority is decided server-side
    // by canDeleteTask — never trust a client-supplied role.
    const deleted = await deleteTask(req.user!, Number(req.params.id));
    res.json(deleted);
  } catch (err) {
    next(err);
  }
};

export const deleteProjectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const deleted = await deleteProject(req.user!, Number(req.params.id));
    res.json(deleted);
  } catch (err) {
    next(err);
  }
};

export const approveCommitHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { message, justification } = req.body;
    const approvedBy = req.user!.id;
    const record = await approveCommit(
      Number(req.params.id),
      message,
      justification,
      approvedBy,
    );
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};

export const getAssignableUsersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = req.query.projectId
      ? Number(req.query.projectId)
      : undefined;
    res.json(await getAssignableUsers(projectId));
  } catch (err) {
    next(err);
  }
};

export const createInvitationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;
    const actorId = req.user!.id;
    const actorRole = req.user!.role as "admin" | "manager" | "employee";

    const invitation = await createInvitation(
      { id: actorId, role: actorRole },
      Number(req.params.id),
      email,
    );
    res.status(201).json(invitation);
  } catch (err) {
    next(err);
  }
};

export const listProjectInvitationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const query = listInvitationsQuerySchema.parse(req.query);
    const invitationsList = await getProjectInvitations(
      Number(req.params.id),
      query.statuses ?? undefined,
    );
    res.json(invitationsList);
  } catch (err) {
    next(err);
  }
};

export const getMyInvitationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;
    const invitations = await getMyInvitations(userId);
    res.json(invitations);
  } catch (err) {
    next(err);
  }
};

export const acceptInvitationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rawToken } = req.body;
    const actorId = req.user!.id;
    const invitation = await acceptInvitation(rawToken, actorId);
    res.json(invitation);
  } catch (err) {
    next(err);
  }
};

export const revokeInvitationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const actorId = req.user!.id;
    const actorRole = req.user!.role as "admin" | "manager" | "employee";
    const invitation = await revokeInvitation(
      { id: actorId, role: actorRole },
      Number(req.params.invitationId),
    );
    res.json(invitation);
  } catch (err) {
    next(err);
  }
};

export const executeAiIntentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = String(req.headers["x-ai-api-key"] ?? "");
    const client = await verifyAiClient(apiKey);

    const { intent, payload } = executeAiIntentSchema.parse(req.body);
    const actorUserId = (req as any).user?.id;
    const actorRole = (req as any).user?.role;
    const result = await executeAiIntent({
      clientId: client.id,
      actorUserId,
      actorRole,
      projectId: Number(req.params.id),
      intent,
      payload: payload ?? {},
      ip: req.ip,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const listAiActionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = String(req.headers["x-ai-api-key"] ?? "");
    const client = await verifyAiClient(apiKey);
    const query = listAiActionsQuerySchema.parse(req.query);
    const actions = await listAiActions({
      clientId: client.id,
      projectId: query.projectId,
    });
    res.json(actions);
  } catch (err) {
    next(err);
  }
};

export const registerAiClientHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, scope } = req.body;
    const client = await registerAiClient({
      name: name ?? "Northstar Web",
      scope: scope ?? "write",
    });
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
};

export const aiChatHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { message } = req.body;
    const projectId = Number(req.params.id);

    const provider = getAiProvider();
    if (!provider) {
      return res.status(503).json({ error: "AI provider not configured. Set GROQ_API_KEY." });
    }

    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Define tools for the LLM
    const tools: AiTool[] = [
      {
        name: "search_tasks",
        description: "Search for tasks by title or description. Use this to find a task by name before using move_task or assign_task.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "Search query" } },
          required: ["query"],
        },
      },
      {
        name: "create_task",
        description: "Create a new task in the project.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title" },
            status: { type: "string", description: "Initial status (backlog, ai_drafting, ready, in_progress, needs_revision, validated, done)" },
          },
          required: ["title"],
        },
      },
      {
        name: "move_task",
        description: "Move a task to a different column.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "integer", description: "The ID of the task to move" },
            status: { type: "string", enum: ["backlog", "ai_drafting", "ready", "in_progress", "needs_revision", "validated", "done"], description: "Target column status" },
          },
          required: ["taskId", "status"],
        },
      },
      {
        name: "assign_task",
        description: "Assign a task to a team member.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "integer", description: "The ID of the task to assign" },
            assigneeName: { type: "string", description: "Name of the person to assign" },
          },
          required: ["taskId", "assigneeName"],
        },
      },
      {
        name: "list_tasks",
        description: "List all tasks in the project.",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "help",
        description: "Show help information about what you can do.",
        parameters: { type: "object", properties: {} },
      },
    ];

    // Turn 1: Get initial AI response (may be text or tool call)
    const turn1Result = await provider.chat({
      systemPrompt: buildAiSystemPrompt(),
      userMessage: message,
      tools,
    });

    console.log("[AI] Turn 1:", JSON.stringify(turn1Result));

    let finalResult: ChatResult = turn1Result;
    let hadSearchStep = false;
    let previousMessages: Array<{ role: string; content: any; toolCallId?: string }> = [];

    // Handle tool call or text response
    if (turn1Result.kind === "tool_call") {
      const tc = turn1Result.toolCall;
      console.log("[AI] Tool call:", tc.name, tc.arguments);

      // Execute the tool and format result for LLM
      const toolResult = await executeToolCall(tc, projectId);
      previousMessages.push({ role: "tool", toolCallId: tc.name, content: toolResult });

      // Turn 2: Feed tool result back, get final response
      const turn2Result = await provider.chat({
        systemPrompt: buildAiSystemPrompt(),
        userMessage: message,
        tools,
        previousMessages,
      });

      console.log("[AI] Turn 2:", JSON.stringify(turn2Result));
      finalResult = turn2Result;

      // If Turn 2 is also a tool call, only allow search_tasks as a second tool call (safety)
      if (turn2Result.kind === "tool_call") {
        if (turn2Result.toolCall.name === "search_tasks") {
          hadSearchStep = true;
          const query = String(turn2Result.toolCall.arguments?.query ?? "").trim();
          if (query) {
            const results = await searchTasks(projectId, query);
            previousMessages.push({ role: "tool", toolCallId: "search_tasks", content: formatSearchResults(results) });
            const turn3Result = await provider.chat({
              systemPrompt: buildAiSystemPrompt(),
              userMessage: message,
              tools,
              previousMessages,
            });
            console.log("[AI] Turn 3:", JSON.stringify(turn3Result));
            finalResult = turn3Result;
          }
        } else {
          // Second tool call that's not search = unknown
          finalResult = {
            kind: "text",
            content: "I wasn't able to complete that. Please try a different request.",
            message: "I wasn't able to complete that. Please try a different request.",
            intent: "unknown",
            payload: {},
          };
        }
      }
    }

    // Extract final result (must be text at this point)
    let finalTextResult: { content: string; message: string; intent: string; payload: Record<string, unknown> };
    if (finalResult.kind === "text") {
      finalTextResult = finalResult;
    } else {
      // Tool call at the end — shouldn't happen, but handle gracefully
      finalTextResult = {
        content: "I'm not sure how to help with that. Try asking for help.",
        message: "I'm not sure how to help with that. Try asking for help.",
        intent: "unknown",
        payload: {},
      };
    }

    // Execute the final action (if actionable)
    let executionResult = null;
    const finalIntent = finalTextResult.intent;
    if (finalIntent !== "help" && finalIntent !== "unknown" && finalIntent !== "list_tasks") {
      executionResult = await executeAiIntent({
        clientId: 0,
        actorUserId: userId,
        actorRole: userRole,
        projectId,
        intent: finalIntent,
        payload: finalTextResult.payload,
      });
    }

    res.json({
      content: finalTextResult.content ?? finalTextResult.message,
      message: finalTextResult.message ?? finalTextResult.content ?? "OK",
      intent: finalIntent,
      payload: finalTextResult.payload,
      executed: executionResult?.ok ?? false,
      hadSearchStep,
    });
  } catch (err) {
    next(err);
  }
};

// Execute a single tool call and return a result string for the LLM.
// Only information-gathering tools (search, list, help). Mutations route through executeAiIntent.
async function executeToolCall(toolCall: { name: string; arguments: Record<string, unknown> }, projectId: number): Promise<string> {
  switch (toolCall.name) {
    case "search_tasks": {
      const query = String(toolCall.arguments.query ?? "").trim();
      if (!query) return JSON.stringify({ error: "No search query provided" });
      const results = await searchTasks(projectId, query);
      return formatSearchResults(results);
    }
    case "list_tasks": {
      const allTasks = await getTasksByProject(projectId);
      return JSON.stringify({ count: allTasks.length, tasks: allTasks.map((t: any) => ({ id: t.id, title: t.title, status: t.status })) });
    }
    case "help": {
      return JSON.stringify({ message: "You can create tasks, move them between columns, assign them, search for tasks, and list all tasks. Try: 'Create a task called Fix bug', 'Move Fix bug to done', 'Assign Fix bug to John'." });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
  }
}

function formatSearchResults(results: any[]): string {
  if (results.length === 0) {
    return JSON.stringify({ count: 0, message: "No tasks matched the search query." });
  }
  return JSON.stringify({
    count: results.length,
    tasks: results.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
  });
}

function buildAiSystemPrompt(): string {
  return `You are an AI assistant for a Kanban project management tool. Help users manage tasks through natural language.

You have access to the following tools. Use them to help the user:

- search_tasks(query): Search for tasks by title or description. Use this BEFORE move_task or assign_task when the user references a task by name.
- create_task(title, status?): Create a new task.
- move_task(taskId, status): Move a task to a different column. status must be one of: backlog, ai_drafting, ready, in_progress, needs_revision, validated, done.
- assign_task(taskId, assigneeName): Assign a task to a team member by name.
- list_tasks(): List all tasks in the project.
- help(): Show help information.

Use search_tasks first when the user mentions a task by name. Then use the task ID from the search results in your move_task or assign_task call. Respond with tool calls when you need to act, or with text for help/unknown/fallback responses.`;
}

// ---- Labels ----------------------------------------------------------------
export const getLabelsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = Number(req.params.id);
    const labels = await getLabels(projectId);
    res.json(labels);
  } catch (err) {
    next(err);
  }
};

export const createLabelHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = Number(req.params.id);
    const label = await createLabel(projectId, req.body);
    res.status(201).json(label);
  } catch (err) {
    next(err);
  }
};

export const deleteLabelHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const labelId = Number(req.params.labelId);
    await deleteLabel(labelId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const addLabelToTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.taskId);
    const labelId = Number(req.params.labelId);
    await addLabelToTask(taskId, labelId);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const removeLabelFromTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.taskId);
    const labelId = Number(req.params.labelId);
    await removeLabelFromTask(taskId, labelId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getTaskLabelsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.taskId);
    const labels = await getTaskLabels(taskId);
    res.json(labels);
  } catch (err) {
    next(err);
  }
};

// ---- Task Comments ---------------------------------------------------------
export const getTaskCommentsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.taskId);
    const comments = await getTaskComments(taskId);
    res.json(comments);
  } catch (err) {
    next(err);
  }
};

export const createTaskCommentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.taskId);
    const actorId = req.user!.id;
    const { content } = req.body;
    const comment = await createTaskComment(taskId, actorId, content);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};

export const deleteTaskCommentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = Number(req.params.commentId);
    await deleteTaskComment(commentId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ---- Task Priority & Due Date ---------------------------------------------
export const updateTaskPriorityHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.id);
    const { priority } = req.body;
    const updated = await updateTaskPriority(taskId, priority);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const updateTaskDueDateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Number(req.params.id);
    const { dueDate } = req.body;
    const updated = await updateTaskDueDate(taskId, dueDate ? new Date(dueDate) : null);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ---- Search ----------------------------------------------------------------
export const searchTasksHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = Number(req.params.id);
    const query = String(req.query.q ?? "");
    const tasks = await searchTasks(projectId, query);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};
