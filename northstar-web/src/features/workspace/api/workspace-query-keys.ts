export const workspaceKeys = {
  all: ["workspace"] as const,
  projects: () => [...workspaceKeys.all, "projects"] as const,
  projectTasks: (projectId: number) =>
    [...workspaceKeys.all, "projects", projectId, "tasks"] as const,
  taskSuggestions: (taskId: number) =>
    [...workspaceKeys.all, "tasks", taskId, "suggestions"] as const,
  assignableUsers: () => [...workspaceKeys.all, "users"] as const,
};
