import { useQuery } from "@tanstack/react-query";
import { getTaskSuggestions } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";

export const useTaskSuggestions = (taskId: number) => {
  return useQuery({
    queryKey: workspaceKeys.taskSuggestions(taskId),
    queryFn: () => getTaskSuggestions(taskId),
    enabled: taskId > 0,
  });
};
