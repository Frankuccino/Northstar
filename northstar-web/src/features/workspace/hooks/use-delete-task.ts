import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTask } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
};
