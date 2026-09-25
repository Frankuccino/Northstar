import type { Request, Response, NextFunction } from "express";
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

    // Turn 1: Get initial AI response (may include search intent)
    const turn1Result = await provider.chat({
      systemPrompt: buildAiSystemPrompt(),
      userMessage: message,
    });

    console.log("[AI] Turn 1:", JSON.stringify(turn1Result));

    let finalResult = turn1Result;
    let hadSearchStep = false;

    // If the AI wants to search first, execute search and feed results back
    if (turn1Result.intent === "search_tasks") {
      hadSearchStep = true;
      const query = String(turn1Result.payload?.query ?? "").trim();

      if (query) {
        const searchResults = await searchTasks(projectId, query);
        console.log("[AI] Search results for '" + query + "':", searchResults.length, "tasks");

        // Turn 2: Feed search results back, get final action
        const turn2Prompt = buildSearchContextPrompt(message, searchResults);
        finalResult = await provider.chat({
          systemPrompt: turn2Prompt,
          userMessage: message,
        });

        console.log("[AI] Turn 2 (after search):", JSON.stringify(finalResult));

        // Safety: if turn 2 also says search_tasks, treat as unknown
        if (finalResult.intent === "search_tasks") {
          finalResult = {
            ...finalResult,
            intent: "unknown",
            message: "I searched but couldn't determine the right action. Please clarify your request.",
          };
        }
      } else {
        // Empty query — treat as unknown
        finalResult = {
          ...turn1Result,
          intent: "unknown",
          message: "Please provide a search term to find tasks.",
        };
      }
    }

    // Execute the final action (if actionable)
    let executionResult = null;
    const finalIntent = finalResult.intent;
    if (finalIntent !== "help" && finalIntent !== "unknown" && finalIntent !== "list_tasks") {
      executionResult = await executeAiIntent({
        clientId: 0,
        actorUserId: userId,
        actorRole: userRole,
        projectId,
        intent: finalIntent,
        payload: finalResult.payload,
      });
    }

    res.json({
      content: finalResult.content ?? finalResult.message,
      message: finalResult.message ?? finalResult.content ?? "OK",
      intent: finalIntent,
      payload: finalResult.payload,
      executed: executionResult?.ok ?? false,
      hadSearchStep,
    });
  } catch (err) {
    next(err);
  }
};

function buildAiSystemPrompt(): string {
  return `You are an AI assistant for a Kanban project management tool. Help users manage tasks through natural language.

Available actions:
- create_task: Create a new task (requires title)
- move_task: Move a task to a different column (requires taskId and status: backlog, ai_drafting, ready, in_progress, needs_revision, validated, done)
- assign_task: Assign a task to someone (requires taskId and assigneeName)
- search_tasks: Search for tasks by title or description (requires query). Use this to find a task by name BEFORE using move_task or assign_task.
- list_tasks: Show tasks
- help: Show help info

Respond in JSON format:
{"intent": "action_name", "payload": {"key": "value"}, "message": "Human readable response"}

When a user asks you to move or assign a task by name, first use search_tasks to find it, then use the taskId from the search results in your final action.`;
}

function buildSearchContextPrompt(userMessage: string, searchResults: any[]): string {
  const resultsText = searchResults.length > 0
    ? `SEARCH RESULTS:\n${searchResults.map((t: any) => `  - Task ${t.id}: "${t.title}" (status: ${t.status}${t.priority ? ", priority: " + t.priority : ""})`).join("\n")}\n\nBased on these results, produce your final action. Copy the task ID from the matching result into your move_task or assign_task payload. Do NOT use search_tasks again.`
    : `SEARCH RESULTS: No tasks matched the search query.\n\nInform the user that no matching tasks were found, or offer to create a new one.`;

  return `You are an AI assistant for a Kanban project management tool.

Available actions (search already done — do NOT use search_tasks again):
- create_task: Create a new task (requires title)
- move_task: Move a task to a different column (requires taskId and status)
- assign_task: Assign a task to someone (requires taskId and assigneeName)
- list_tasks: Show tasks
- help: Show help info
- unknown: If you can't determine the right action

${resultsText}

User's request: "${userMessage}"

Respond in JSON format:
{"intent": "action_name", "payload": {"key": "value"}, "message": "Human readable response"}`;
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
