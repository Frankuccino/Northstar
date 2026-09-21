import { api } from "@/lib/axios";

import type {
  Project,
  Task,
  AiSuggestion,
  TaskValidation,
  CommitRecord,
  CreateProjectInput,
  CreateTaskInput,
  GenerateSuggestionInput,
  ValidateSuggestionInput,
  ApproveCommitInput,
  TaskStatus,
} from "../types/workspace";

// The backend returns Drizzle rows in snake_case. These mappers convert to the
// camelCase domain types the UI consumes. Keeping the transform at the edge
// (here, in the api layer) means components never see snake_case.
const toProject = (r: any): Project => ({
  id: r.id,
  name: r.name,
  description: r.description ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  taskCount: r.taskCount,
});

const toTask = (r: any): Task => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  description: r.description ?? null,
  status: r.status as TaskStatus,
  priority: r.priority ?? "medium",
  assigneeId: r.assignee_id ?? null,
  assigneeName: r.assignee_name ?? null,
  dueDate: r.due_date ? (r.due_date instanceof Date ? r.due_date.toISOString() : r.due_date) : null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toSuggestion = (r: any): AiSuggestion => ({
  id: r.id,
  taskId: r.task_id,
  version: r.version,
  type: r.type,
  content: r.content,
  promptSnapshot: r.prompt_snapshot ?? null,
  model: r.model ?? null,
  createdAt: r.created_at,
});

const toValidation = (r: any): TaskValidation => ({
  id: r.id,
  taskId: r.task_id,
  suggestionId: r.suggestion_id,
  decision: r.decision,
  reason: r.reason ?? null,
  actorId: r.actor_id,
  createdAt: r.created_at,
});

const toCommit = (r: any): CommitRecord => ({
  id: r.id,
  taskId: r.task_id,
  message: r.message,
  justification: r.justification ?? null,
  approvedBy: r.approved_by,
  createdAt: r.created_at,
});

// ---- Projects -------------------------------------------------------------
export const getProjects = async (): Promise<Project[]> => {
  const res = await api.get("/workspace");
  return res.data.map(toProject);
};

export const getProject = async (id: number): Promise<Project> => {
  const res = await api.get(`/workspace/${id}`);
  return toProject(res.data);
};

export const createProject = async (
  data: CreateProjectInput,
): Promise<Project> => {
  const res = await api.post("/workspace", data);
  return toProject(res.data);
};

export const updateProject = async (
  id: number,
  data: { name?: string; description?: string | null },
): Promise<Project> => {
  const res = await api.patch(`/workspace/${id}`, data);
  return toProject(res.data);
};

// ---- Tasks ----------------------------------------------------------------
export const getProjectTasks = async ({
  projectId,
  status,
  assigneeId,
  priority,
}: {
  projectId: number;
  status?: TaskStatus;
  assigneeId?: number | null;
  priority?: string;
}): Promise<Task[]> => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  if (assigneeId !== undefined)
    params.set("assigneeId", String(assigneeId ?? "null"));
  const qs = params.toString();
  const res = await api.get(
    `/workspace/${projectId}/tasks${qs ? `?${qs}` : ""}`,
  );
  return res.data.map(toTask);
};

export const createTask = async (data: CreateTaskInput): Promise<Task> => {
  const { projectId, ...body } = data;
  const res = await api.post(`/workspace/${projectId}/tasks`, body);
  return toTask(res.data);
};

export const moveTask = async (
  taskId: number,
  status: TaskStatus,
): Promise<Task> => {
  const res = await api.patch(`/workspace/tasks/${taskId}/move`, { status });
  return toTask(res.data);
};

// ---- AI suggestions + validation -----------------------------------------
export const getTaskSuggestions = async (
  taskId: number,
): Promise<AiSuggestion[]> => {
  const res = await api.get(`/workspace/tasks/${taskId}/suggestions`);
  return res.data.map(toSuggestion);
};

export const generateSuggestion = async (
  taskId: number,
  data: GenerateSuggestionInput,
): Promise<AiSuggestion> => {
  const res = await api.post(`/workspace/tasks/${taskId}/suggestions`, data);
  return toSuggestion(res.data);
};

export const validateSuggestion = async (
  taskId: number,
  data: ValidateSuggestionInput,
): Promise<TaskValidation> => {
  const res = await api.post(`/workspace/tasks/${taskId}/validate`, data);
  return toValidation(res.data);
};

export const approveCommit = async (
  taskId: number,
  data: ApproveCommitInput,
): Promise<CommitRecord> => {
  const res = await api.post(`/workspace/tasks/${taskId}/commit`, data);
  return toCommit(res.data);
};

// Human approval shortcut: walk the task to `validated` via legal transitions,
// independent of AI suggestions. Enables committing tasks that were completed
// without AI output (or tasks stuck in `backlog`).
export const markValidated = async (taskId: number): Promise<Task> => {
  const res = await api.patch(`/workspace/tasks/${taskId}/validate-task`);
  return toTask(res.data);
};

// Assignee ----------------------------------------------------------------
// Reassigns a task's assignee. Fetches assignable users from
// GET /workspace/users (id + name). Clears the assignee when null is passed.
export const getAssignableUsers = async (
  projectId?: number,
): Promise<{ id: number; name: string }[]> => {
  const params = projectId ? `?projectId=${projectId}` : "";
  const res = await api.get(`/workspace/users${params}`);
  return res.data;
};

export const assignTask = async (
  taskId: number,
  assigneeId: number | null,
): Promise<Task> => {
  const res = await api.patch(`/workspace/tasks/${taskId}/assign`, { assigneeId });
  return toTask(res.data);
};

// Delete is server-gated by canDeleteTask (admin/manager today). The UI button
// is shown only for those roles as a UX hint, but the server makes the final
// decision — a non-privileged user's request is rejected with 403.
export const updateTask = async (
  id: number,
  data: { title?: string; description?: string | null },
): Promise<Task> => {
  const res = await api.patch(`/workspace/tasks/${id}`, data);
  return toTask(res.data);
};

// ---- Labels ----------------------------------------------------------------
export const getLabels = async (projectId: number): Promise<any[]> => {
  const res = await api.get(`/workspace/projects/${projectId}/labels`);
  return res.data;
};

export const createLabel = async (
  projectId: number,
  data: { name: string; color: string }
): Promise<any> => {
  const res = await api.post(`/workspace/projects/${projectId}/labels`, data);
  return res.data;
};

export const deleteLabel = async (labelId: number): Promise<void> => {
  await api.delete(`/workspace/labels/${labelId}`);
};

export const addLabelToTask = async (taskId: number, labelId: number): Promise<any> => {
  const res = await api.post(`/workspace/tasks/${taskId}/labels/${labelId}`);
  return res.data;
};

export const removeLabelFromTask = async (taskId: number, labelId: number): Promise<void> => {
  await api.delete(`/workspace/tasks/${taskId}/labels/${labelId}`);
};

export const getTaskLabels = async (taskId: number): Promise<any[]> => {
  const res = await api.get(`/workspace/tasks/${taskId}/labels`);
  return res.data;
};

// ---- Task Comments ---------------------------------------------------------
export const getTaskComments = async (taskId: number): Promise<any[]> => {
  const res = await api.get(`/workspace/tasks/${taskId}/comments`);
  return res.data;
};

export const createTaskComment = async (
  taskId: number,
  content: string
): Promise<any> => {
  const res = await api.post(`/workspace/tasks/${taskId}/comments`, { content });
  return res.data;
};

export const deleteTaskComment = async (commentId: number): Promise<void> => {
  await api.delete(`/workspace/comments/${commentId}`);
};

// ---- Task Priority & Due Date ---------------------------------------------
export const updateTaskPriority = async (
  taskId: number,
  priority: string
): Promise<any> => {
  const res = await api.patch(`/workspace/tasks/${taskId}/priority`, { priority });
  return res.data;
};

export const updateTaskDueDate = async (
  taskId: number,
  dueDate: string | null
): Promise<any> => {
  const res = await api.patch(`/workspace/tasks/${taskId}/due-date`, { dueDate });
  return res.data;
};

// ---- Search ----------------------------------------------------------------
export const searchTasks = async (projectId: number, query: string): Promise<any[]> => {
  const res = await api.get(`/workspace/projects/${projectId}/search?q=${encodeURIComponent(query)}`);
  return res.data;
};

export const deleteTask = async (taskId: number): Promise<void> => {
  await api.delete(`/workspace/tasks/${taskId}`);
};

export const deleteProject = async (projectId: number): Promise<{ id: number }> => {
  const res = await api.delete(`/workspace/${projectId}`);
  return res.data;
};

export const getProjectMembers = async (projectId: number): Promise<any[]> => {
  const res = await api.get(`/workspace/projects/${projectId}/members`);
  return res.data;
};

// ---- Invitations ----------------------------------------------------------
export const createInvitation = async (
  projectId: number,
  email: string,
): Promise<{ id: number; email: string; status: string; rawToken: string }> => {
  const res = await api.post(`/workspace/projects/${projectId}/invitations`, {
    email,
  });
  return res.data;
};

export const getProjectInvitations = async (
  projectId: number,
  statuses?: string[],
): Promise<
  {
    id: number;
    email: string;
    status: string;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
    invitedByName: string | null;
  }[]
> => {
  const params = new URLSearchParams();
  if (statuses?.length)
    params.set("statuses", statuses.join(","));
  const qs = params.toString();
  const res = await api.get(
    `/workspace/projects/${projectId}/invitations${qs ? `?${qs}` : ""}`,
  );
  return res.data;
};

export const revokeInvitation = async (
  projectId: number,
  invitationId: number,
): Promise<{ id: number; status: string }> => {
  const res = await api.delete(
    `/workspace/projects/${projectId}/invitations/${invitationId}`,
  );
  return res.data;
};

export const getMyInvitations = async (): Promise<
  {
    id: number;
    email: string;
    status: string;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
    invitedByName: string | null;
    projectId: number;
    projectName: string;
  }[]
> => {
  const res = await api.get("/workspace/invitations/my");
  return res.data;
};

export const acceptInvitation = async (
  rawToken: string,
): Promise<{ id: number; status: string }> => {
  const res = await api.post("/workspace/invitations/accept", { rawToken });
  return res.data;
};
