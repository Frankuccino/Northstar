import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProject } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
    },
  });
};
