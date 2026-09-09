import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProject } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string | null } }) =>
      updateProject(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.project(data.id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
    },
  });
};
