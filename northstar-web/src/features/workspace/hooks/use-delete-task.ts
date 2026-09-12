import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTask } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import { useToast } from "@/features/theme/toast";

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      toast({ type: "success", title: "Task deleted" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to delete task", description: err?.response?.data?.error });
    },
  });
};
