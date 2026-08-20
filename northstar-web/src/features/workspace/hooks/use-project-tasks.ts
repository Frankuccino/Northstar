import { useQuery } from "@tanstack/react-query";
import { getProjectTasks } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";

export const useProjectTasks = (projectId: number) => {
  return useQuery({
    queryKey: workspaceKeys.projectTasks(projectId),
    queryFn: () => getProjectTasks(projectId),
    enabled: projectId > 0,
  });
};
