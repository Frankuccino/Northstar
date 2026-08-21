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
});

const toTask = (r: any): Task => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  description: r.description ?? null,
  status: r.status as TaskStatus,
  assigneeId: r.assignee_id ?? null,
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

export const createProject = async (
  data: CreateProjectInput,
): Promise<Project> => {
  const res = await api.post("/workspace", data);
  return toProject(res.data);
};

// ---- Tasks ----------------------------------------------------------------
export const getProjectTasks = async (projectId: number): Promise<Task[]> => {
  const res = await api.get(`/workspace/${projectId}/tasks`);
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
