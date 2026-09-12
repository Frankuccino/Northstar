import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTask } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import { toast } from "sonner";

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success("Task deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "Failed to delete task");
    },
  });
};
