import type { TaskStatus } from "../types/workspace";

export const workspaceKeys = {
  all: ["workspace"] as const,
  projects: () => [...workspaceKeys.all, "projects"] as const,
  projectTasks: (
    projectId: number,
    filters?: { status?: TaskStatus; assigneeId?: number | null },
  ) =>
    [
      ...workspaceKeys.all,
      "projects",
      projectId,
      "tasks",
      filters?.status,
      filters?.assigneeId,
    ] as const,
  taskSuggestions: (taskId: number) =>
    [...workspaceKeys.all, "tasks", taskId, "suggestions"] as const,
  assignableUsers: () => [...workspaceKeys.all, "users"] as const,
};
