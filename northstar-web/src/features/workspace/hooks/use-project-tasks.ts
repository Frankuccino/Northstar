import { useQuery } from "@tanstack/react-query";
import { getProjectTasks } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import type { TaskStatus } from "../types/workspace";

export const useProjectTasks = (
  projectId: number,
  filters?: { status?: TaskStatus; assigneeId?: number | null },
) => {
  return useQuery({
    queryKey: workspaceKeys.projectTasks(projectId, filters),
    queryFn: () => getProjectTasks({ projectId, ...filters }),
    enabled: projectId > 0,
  });
};
