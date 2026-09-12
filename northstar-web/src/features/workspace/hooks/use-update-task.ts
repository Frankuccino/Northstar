import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import { toast } from "sonner";

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; description?: string | null } }) =>
      updateTask(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(workspaceKeys.projectTasks(data.projectId), (old: any) =>
        old?.map((t: any) => (t.id === data.id ? { ...t, ...data } : t))
      );
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(data.projectId) });
      toast.success("Task updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "Failed to update task");
    },
  });
};
