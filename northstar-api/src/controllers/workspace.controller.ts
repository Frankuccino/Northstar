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
import {
  getToolDefinitions,
  getSystemPromptEntries,
  executeAction,
  type ActionContext,
} from "../services/ai-action-registry.js";
import {
  listTasksQuerySchema,
  listInvitationsQuerySchema,
} from "../schemas/workspace.schema.js";
import {
  executeAiIntentSchema,
  listAiActionsQuerySchema,
} from "../schemas/workspace.schema.js";
import { db } from "../db/index.js";

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
    const task = await assignTask(Number(req.params.id), actorId, assigneeId);
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
  // Declared outside try so the catch can decide how to report failures —
  // once SSE headers are sent we can't fall through to error middleware.
  const streaming = req.body?.stream === true;
  try {
    const { message } = req.body;
    const projectId = Number(req.params.id);

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const provider = getAiProvider();
    if (!provider) {
      return res
        .status(503)
        .json({ error: "AI provider not configured. Set GROQ_API_KEY." });
    }

    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // ---- Agent activity (streamed when requested) -------------------------
    // A "step" is one thing the agent did: a tool call, with its args, result
    // summary, and duration. Steps are collected for the JSON response and
    // emitted as SSE frames when the client asks to stream.
    const steps: AgentStep[] = [];

    const emit = (event: string, data: unknown) => {
      if (!streaming) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    if (streaming) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
    }

    // Emit a running step, then return a finisher that records the result.
    const beginStep = (tool: string, args: Record<string, unknown>) => {
      const startedAt = Date.now();
      emit("step", { tool, args, status: "running" });
      return (envelope: string) => {
        const parsed = safeParseEnvelope(envelope, tool);
        const step: AgentStep = {
          tool,
          args,
          status: parsed.ok ? "done" : "error",
          summary: parsed.summary,
          ok: parsed.ok,
          durationMs: Date.now() - startedAt,
          at: new Date().toISOString(),
        };
        steps.push(step);
        emit("step", step);
        return parsed;
      };
    };

    // Define tools for the LLM — sourced from the action registry
    const tools = getToolDefinitions();

    // Turn 1: Get initial AI response (may be text or tool call)
    const turn1Result = await provider.chat({
      systemPrompt: buildAiSystemPrompt(),
      userMessage: message,
      tools,
    });

    console.log("[AI] Turn 1:", JSON.stringify(turn1Result));

    let finalResult: ChatResult = turn1Result;
    let hadSearchStep = false;
    let toolExecuted = false;
    // The most recent tool the agent ran — the authoritative intent.
    let lastToolName: string | null = null;
    // Only mutations should tell the client to refetch the board. Read-only
    // tools (search/list/help) leave the board untouched.
    let mutationExecuted = false;
    const MUTATION_TOOLS = new Set(["create_task", "move_task", "assign_task"]);
    let previousMessages: Array<{
      role: string;
      content: any;
      tool_call_id?: string;
      tool_calls?: any[];
    }> = [];

    // Handle tool call or text response
    if (turn1Result.kind === "tool_call") {
      const tc = turn1Result.toolCall;
      console.log("[AI] Tool call:", tc.name, tc.arguments);

      // Execute the tool and format result for LLM
      const finishStep = beginStep(tc.name, tc.arguments);
      const toolResult = await executeAction(tc.name, tc.arguments, { projectId, userId, userRole });
      const parsed = finishStep(toolResult);
      toolExecuted = true;
      lastToolName = tc.name;
      if (tc.name === "search_tasks") hadSearchStep = true;
      // Only a SUCCESSFUL mutation changes the board — an attempted-but-rejected
      // move must not trigger a refetch or report changed:true.
      if (MUTATION_TOOLS.has(tc.name) && parsed.ok) mutationExecuted = true;

      // Build the conversation for Turn 2: assistant tool_call + tool result
      // Groq's Harmony tokenizer needs the assistant tool_call BEFORE the tool result
      const assistantToolCallMsg = {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: turn1Result.toolCallId,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          },
        ],
      };
      previousMessages.push(assistantToolCallMsg);
      previousMessages.push({
        role: "tool" as const,
        tool_call_id: turn1Result.toolCallId,
        content: toolResult,
      });

    // Turn 2: Feed tool result back. Tools are re-sent so the LLM can chain a
    // second call (search → move/assign). Safe now that tool_choice is set and
    // every tool result is preceded by its assistant tool_call message.
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
          const query = String(
            turn2Result.toolCall.arguments?.query ?? "",
          ).trim();
          if (query) {
            const finishSearch = beginStep("search_tasks", { query });
            const results = await searchTasks(projectId, query);
            const searchEnvelope = formatSearchResults(results, query);
            finishSearch(searchEnvelope);
            previousMessages.push({
              role: "assistant" as const,
              content: null,
              tool_calls: [
                {
                  id: turn2Result.toolCallId,
                  type: "function" as const,
                  function: {
                    name: turn2Result.toolCall.name,
                    arguments: JSON.stringify(turn2Result.toolCall.arguments),
                  },
                },
              ],
            });
            previousMessages.push({
              role: "tool" as const,
              tool_call_id: turn2Result.toolCallId,
              content: searchEnvelope,
            });
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
          // Second tool call that's not search = execute it (e.g. move/assign after search)
          const tc2 = turn2Result.toolCall;
          console.log("[AI] Turn 2 tool call:", tc2.name, tc2.arguments);
          const finishStep2 = beginStep(tc2.name, tc2.arguments);
          const toolResult2 = await executeAction(tc2.name, tc2.arguments, { projectId, userId, userRole });
          const parsed2 = finishStep2(toolResult2);
          toolExecuted = true;
          lastToolName = tc2.name;
          if (MUTATION_TOOLS.has(tc2.name) && parsed2.ok) mutationExecuted = true;
          previousMessages.push({
            role: "assistant" as const,
            content: null,
            tool_calls: [
              {
                id: turn2Result.toolCallId,
                type: "function" as const,
                function: {
                  name: tc2.name,
                  arguments: JSON.stringify(tc2.arguments),
                },
              },
            ],
          });
          previousMessages.push({
            role: "tool" as const,
            tool_call_id: turn2Result.toolCallId,
            content: toolResult2,
          });
          const turn3Result = await provider.chat({
            systemPrompt: buildAiSystemPrompt(),
            userMessage: message,
            tools,
            previousMessages,
          });
          console.log("[AI] Turn 3 (after mutation):", JSON.stringify(turn3Result));
          finalResult = turn3Result;
        }
      }
    }

    let finalTextResult: {
      content: string;
      message: string;
      intent: string;
      payload: Record<string, unknown>;
    };
    if (finalResult.kind === "text") {
      finalTextResult = finalResult;
    } else {
      // The loop ended on a tool call — the LLM wanted to act again but we've
      // hit the turn cap. Ask once more with no tools so it must reply in
      // prose, explaining what it managed to do and why it stopped. Without
      // this, the user gets a generic failure message that discards a real
      // reason (e.g. a rejected state-machine transition).
      try {
        previousMessages.push({
          role: "assistant" as const,
          content: null,
          tool_calls: [
            {
              id: finalResult.toolCallId,
              type: "function" as const,
              function: {
                name: finalResult.toolCall.name,
                arguments: JSON.stringify(finalResult.toolCall.arguments),
              },
            },
          ],
        });
        previousMessages.push({
          role: "tool" as const,
          tool_call_id: finalResult.toolCallId,
          content: toolErr(
            finalResult.toolCall.name,
            "STEP_LIMIT",
            "No further tool calls are available. Summarize what happened and what the user can try next.",
          ),
        });

        const summary = await provider.chat({
          systemPrompt: buildAiSystemPrompt(),
          userMessage: message,
          previousMessages,
        });

        finalTextResult =
          summary.kind === "text"
            ? summary
            : {
                content:
                  "I wasn't able to complete that. Please try a different request.",
                message:
                  "I wasn't able to complete that. Please try a different request.",
                intent: "unknown",
                payload: {},
              };
      } catch {
        finalTextResult = {
          content: "I wasn't able to complete that. Please try a different request.",
          message: "I wasn't able to complete that. Please try a different request.",
          intent: "unknown",
          payload: {},
        };
      }
    }

    // Execute the final action (if actionable)
    // Skip when a tool already executed — the tool path is authoritative.
    // Without this guard, parseResponse() keyword-matches the LLM's confirmation
    // prose (e.g. "Your task has been created") and re-runs the mutation.
    let executionResult = null;
    // When a tool ran, the intent is whatever tool that was. parseResponse()
    // guesses intent by keyword-matching prose, which produces nonsense once
    // the LLM writes an explanation ("you could also create a new task" was
    // being reported as intent: create_task).
    const finalIntent = toolExecuted
      ? lastToolName ?? "unknown"
      : finalTextResult.intent;
    if (
      !toolExecuted &&
      finalIntent !== "help" &&
      finalIntent !== "unknown" &&
      finalIntent !== "list_tasks"
    ) {
      executionResult = await executeAiIntent({
        clientId: 0,
        actorUserId: userId,
        actorRole: userRole,
        projectId,
        intent: finalIntent,
        payload: finalTextResult.payload,
      });
    }

    const payload = {
      content: finalTextResult.content ?? finalTextResult.message,
      message: finalTextResult.message ?? finalTextResult.content ?? "OK",
      intent: finalIntent,
      payload: finalTextResult.payload,
      executed: mutationExecuted || (executionResult?.ok ?? false),
      changed: mutationExecuted || (executionResult?.ok ?? false),
      hadSearchStep,
      steps,
    };

    if (streaming) {
      // Terminal frame mirrors the JSON contract, then close the stream.
      emit("done", payload);
      return res.end();
    }

    res.json(payload);
  } catch (err: any) {
    // On a live SSE stream, headers are already sent — an error middleware
    // can't produce a JSON response, so emit an error frame and close.
    if (streaming && res.headersSent) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          code: "INTERNAL",
          message: err?.message ?? "Something went wrong.",
        })}\n\n`,
      );
      return res.end();
    }
    next(err);
  }
};

export interface AgentStep {
  tool: string;
  args: Record<string, unknown>;
  status: "running" | "done" | "error";
  summary?: string;
  ok?: boolean;
  durationMs?: number;
  at?: string;
}

// Parse a tool-result envelope. Tool results are JSON strings produced by
// toolOk()/toolErr(); anything unparseable is surfaced as an error step rather
// than throwing, so one bad tool can't kill the whole request.
function safeParseEnvelope(
  raw: string,
  tool: string,
): { ok: boolean; summary: string; data?: any } {
  try {
    const parsed = JSON.parse(raw);
    return {
      ok: parsed.ok !== false,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      data: parsed.data,
    };
  } catch {
    return { ok: false, summary: `Malformed result from ${tool}.` };
  }
}

function formatSearchResults(results: any[], query?: string): string {
  const q = query?.trim();
  if (results.length === 0) {
    return toolOk(
      "search_tasks",
      q ? `No tasks matched "${q}".` : "No tasks matched the search query.",
      { query: q, count: 0, tasks: [] },
    );
  }
  return toolOk(
    "search_tasks",
    q
      ? `Found ${results.length} task${results.length === 1 ? "" : "s"} matching "${q}".`
      : `Found ${results.length} task${results.length === 1 ? "" : "s"}.`,
    {
      query: q,
      count: results.length,
      tasks: results.map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
    },
  );
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

function buildAiSystemPrompt(): string {
  const toolEntries = getSystemPromptEntries().join("\n");
  return `You are an AI assistant for a Kanban project management tool. Help users manage tasks through natural language.

You have access to the following tools. Use them to help the user:

${toolEntries}

Use search_tasks first when the user mentions a task by name. Then use the task ID from the search results in your move_task or assign_task call. Respond with tool calls when you need to act, or with text for help/unknown/fallback responses.`;
}

// ---- Labels ----------------------------------------------------------------
export const getLabelsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = Number(req.params.id);
    const labels = await getLabels(projectId);
    res.json(labels);
  } catch (err) {
    next(err);
  }
};

export const createLabelHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = Number(req.params.id);
    const label = await createLabel(projectId, req.body);
    res.status(201).json(label);
  } catch (err) {
    next(err);
  }
};

export const deleteLabelHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const labelId = Number(req.params.labelId);
    await deleteLabel(labelId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const addLabelToTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taskId = Number(req.params.taskId);
    const labelId = Number(req.params.labelId);
    await addLabelToTask(taskId, labelId);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const removeLabelFromTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taskId = Number(req.params.taskId);
    const labelId = Number(req.params.labelId);
    await removeLabelFromTask(taskId, labelId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getTaskLabelsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taskId = Number(req.params.taskId);
    const labels = await getTaskLabels(taskId);
    res.json(labels);
  } catch (err) {
    next(err);
  }
};

// ---- Task Comments ---------------------------------------------------------
export const getTaskCommentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taskId = Number(req.params.taskId);
    const comments = await getTaskComments(taskId);
    res.json(comments);
  } catch (err) {
    next(err);
  }
};

export const createTaskCommentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

export const deleteTaskCommentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const commentId = Number(req.params.commentId);
    await deleteTaskComment(commentId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ---- Task Priority & Due Date ---------------------------------------------
export const updateTaskPriorityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taskId = Number(req.params.id);
    const { priority } = req.body;
    const updated = await updateTaskPriority(taskId, priority);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const updateTaskDueDateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taskId = Number(req.params.id);
    const { dueDate } = req.body;
    const updated = await updateTaskDueDate(
      taskId,
      dueDate ? new Date(dueDate) : null,
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ---- Search ----------------------------------------------------------------
export const searchTasksHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = Number(req.params.id);
    const query = String(req.query.q ?? "");
    const tasks = await searchTasks(projectId, query);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};
